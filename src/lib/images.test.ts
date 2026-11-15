import { describe, expect, it } from "vitest";
import { detectImageType, receiptSizeError } from "./images";

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]);
const WEBP = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

describe("detectImageType", () => {
  it("recognizes PNG magic bytes", () => {
    expect(detectImageType(PNG)).toBe("image/png");
  });

  it("recognizes JPEG magic bytes", () => {
    expect(detectImageType(JPEG)).toBe("image/jpeg");
  });

  it("recognizes WebP magic bytes", () => {
    expect(detectImageType(WEBP)).toBe("image/webp");
  });

  it("rejects other content", () => {
    expect(detectImageType(Uint8Array.from([0x00, 0x01, 0x02, 0x03]))).toBeNull();
    expect(
      detectImageType(new TextEncoder().encode("<script>alert(1)</script>")),
    ).toBeNull();
  });

  it("rejects truncated signatures", () => {
    expect(detectImageType(PNG.slice(0, 4))).toBeNull();
    expect(detectImageType(Uint8Array.from([0xff, 0xd8]))).toBeNull();
    expect(detectImageType(WEBP.slice(0, 8))).toBeNull();
  });

  it("is not fooled by a PNG header elsewhere in the payload", () => {
    const sneaky = Uint8Array.from([0x00, ...PNG]);
    expect(detectImageType(sneaky)).toBeNull();
  });
});

describe("receiptSizeError", () => {
  it("allows receipts up to 2 MB", () => {
    expect(receiptSizeError(0)).toBeNull();
    expect(receiptSizeError(2 * 1024 * 1024)).toBeNull();
  });

  it("rejects larger uploads", () => {
    expect(receiptSizeError(2 * 1024 * 1024 + 1)).toBe(
      "Receipts must be 2 MB or smaller",
    );
  });
});
