/**
 * Utility function to convert a direct S3 URL to its CloudFront CDN equivalent.
 * If the URL is not a direct S3 URL or if VITE_CLOUDFRONT_DOMAIN is not defined,
 * it returns the original URL.
 * 
 * @param {string} originalUrl - The original avatar URL (e.g. from Database or Google Auth)
 * @returns {string} The CDN-optimized URL or the original URL
 */
export function getAvatarCdnUrl(originalUrl) {
  if (!originalUrl || typeof originalUrl !== "string") {
    return originalUrl;
  }

  // Get CloudFront domain from environment variables
  let cdnDomain = import.meta.env.VITE_CLOUDFRONT_DOMAIN;
  if (!cdnDomain) {
    return originalUrl;
  }

  // Ensure the domain starts with http:// or https://
  if (!/^https?:\/\//i.test(cdnDomain)) {
    cdnDomain = `https://${cdnDomain}`;
  }

  // Normalize CloudFront domain (remove trailing slash if any)
  const baseCdn = cdnDomain.replace(/\/$/, "");

  // Pattern 1: Virtual-hosted–style: https://bucket-name.s3.region.amazonaws.com/key
  // e.g. https://ten-bucket-cua-toi.s3.ap-southeast-1.amazonaws.com/avatars/user123.jpg
  const virtualHostPattern = /^https?:\/\/[a-zA-Z0-9.-]+\.s3[a-zA-Z0-9.-]*\.amazonaws\.com\//;
  if (virtualHostPattern.test(originalUrl)) {
    return originalUrl.replace(virtualHostPattern, `${baseCdn}/`);
  }

  // Pattern 2: Path-style: https://s3.region.amazonaws.com/bucket-name/key
  // e.g. https://s3.ap-southeast-1.amazonaws.com/ten-bucket-cua-toi/avatars/user123.jpg
  const pathStylePattern = /^https?:\/\/s3[.-][a-zA-Z0-9.-]+\.amazonaws\.com\/[a-zA-Z0-9.-]+\//;
  if (pathStylePattern.test(originalUrl)) {
    return originalUrl.replace(pathStylePattern, `${baseCdn}/`);
  }

  return originalUrl;
}
