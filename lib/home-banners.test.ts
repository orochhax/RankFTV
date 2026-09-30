import assert from "node:assert/strict";
import test from "node:test";
import { homeBannerStoragePath, MAX_HOME_BANNERS, normalizeHomeBanners } from "./home-banners";

test("normalizeHomeBanners keeps only valid, unique public banner entries", () => {
  const validUrl = "https://project.supabase.co/storage/v1/object/public/page-images/user/home-banners/a.webp";
  const result = normalizeHomeBanners([
    { id: "one", imageUrl: validUrl, alt: "Banner principal", linkUrl: "/campeonatos", active: true },
    { id: "one", imageUrl: validUrl, alt: "Duplicado" },
    { id: "bad", imageUrl: "https://example.com/banner.webp", alt: "Host inválido" },
  ]);

  assert.deepEqual(result, [
    { id: "one", imageUrl: validUrl, alt: "Banner principal", linkUrl: "/campeonatos", active: true },
  ]);
});

test("normalizeHomeBanners rejects unsafe links and limits the collection", () => {
  const input = Array.from({ length: MAX_HOME_BANNERS + 3 }, (_, index) => ({
    id: `banner-${index}`,
    imageUrl: `https://project.supabase.co/storage/v1/object/public/page-images/user/home-banners/${index}.webp`,
    alt: `Banner ${index}`,
    linkUrl: index === 0 ? "javascript:alert(1)" : "https://www.rankftv.com/campeonatos",
  }));

  const result = normalizeHomeBanners(input);
  assert.equal(result.length, MAX_HOME_BANNERS);
  assert.equal(result[0]?.linkUrl, null);
  assert.equal(result[1]?.linkUrl, "https://www.rankftv.com/campeonatos");
});

test("homeBannerStoragePath extracts the object path", () => {
  assert.equal(
    homeBannerStoragePath("https://project.supabase.co/storage/v1/object/public/page-images/user/home-banners/a%20b.webp"),
    "user/home-banners/a b.webp",
  );
  assert.equal(homeBannerStoragePath("https://example.com/a.webp"), null);
});
