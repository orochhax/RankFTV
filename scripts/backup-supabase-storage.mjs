import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

function parseEnv(source) {
  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        const key = line.slice(0, separator);
        const value = line.slice(separator + 1).replace(/^(['"])(.*)\1$/, "$2");
        return [key, value];
      }),
  );
}

async function listObjects(storage, bucket, prefix = "") {
  const objects = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await storage.from(bucket).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) throw new Error(`Falha ao listar ${bucket}/${prefix}: ${error.message}`);
    if (!data.length) break;

    for (const item of data) {
      const objectPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) {
        objects.push({
          path: objectPath,
          size: Number(item.metadata?.size ?? 0),
          updatedAt: item.updated_at ?? null,
        });
      } else {
        objects.push(...(await listObjects(storage, bucket, objectPath)));
      }
    }

    if (data.length < 100) break;
    offset += data.length;
  }

  return objects;
}

const outputArgument = process.argv[2];
if (!outputArgument) {
  throw new Error("Uso: node scripts/backup-supabase-storage.mjs <diretorio-saida>");
}

const env = parseEnv(await readFile(path.resolve(".env.local"), "utf8"));
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Credenciais do Supabase ausentes em .env.local");
}

const outputRoot = path.resolve(outputArgument);
await mkdir(outputRoot, { recursive: true });

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
if (bucketsError) throw new Error(`Falha ao listar buckets: ${bucketsError.message}`);

const manifest = {
  generatedAt: new Date().toISOString(),
  projectUrl: env.NEXT_PUBLIC_SUPABASE_URL,
  buckets: [],
  totals: { objects: 0, bytes: 0 },
};
const checksumLines = [];

for (const bucket of buckets.sort((left, right) => left.name.localeCompare(right.name))) {
  const bucketRoot = path.resolve(outputRoot, bucket.name);
  await mkdir(bucketRoot, { recursive: true });
  const remoteObjects = await listObjects(supabase.storage, bucket.name);
  const bucketEntry = { name: bucket.name, objects: [], totals: { objects: 0, bytes: 0 } };

  for (const remoteObject of remoteObjects) {
    const destination = path.resolve(bucketRoot, ...remoteObject.path.split("/"));
    if (!destination.startsWith(`${bucketRoot}${path.sep}`)) {
      throw new Error(`Caminho inseguro recusado: ${bucket.name}/${remoteObject.path}`);
    }

    const { data, error } = await supabase.storage
      .from(bucket.name)
      .download(remoteObject.path);
    if (error) {
      throw new Error(`Falha ao baixar ${bucket.name}/${remoteObject.path}: ${error.message}`);
    }

    const contents = Buffer.from(await data.arrayBuffer());
    if (remoteObject.size && contents.length !== remoteObject.size) {
      throw new Error(`Tamanho divergente em ${bucket.name}/${remoteObject.path}`);
    }

    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, contents);
    const sha256 = createHash("sha256").update(contents).digest("hex");
    const relativePath = `${bucket.name}/${remoteObject.path}`;
    checksumLines.push(`${sha256} *${relativePath}`);
    bucketEntry.objects.push({ ...remoteObject, downloadedBytes: contents.length, sha256 });
    bucketEntry.totals.objects += 1;
    bucketEntry.totals.bytes += contents.length;
  }

  manifest.buckets.push(bucketEntry);
  manifest.totals.objects += bucketEntry.totals.objects;
  manifest.totals.bytes += bucketEntry.totals.bytes;
  process.stdout.write(`${bucket.name}: ${bucketEntry.totals.objects} arquivo(s)\n`);
}

await writeFile(
  path.join(outputRoot, "storage-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
await writeFile(
  path.join(outputRoot, "STORAGE-SHA256SUMS.txt"),
  `${checksumLines.join("\n")}\n`,
  "utf8",
);

process.stdout.write(
  `Total: ${manifest.totals.objects} arquivo(s), ${manifest.totals.bytes} bytes\n`,
);
