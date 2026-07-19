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


  let cdnDomain = import.meta.env.VITE_CLOUDFRONT_DOMAIN;
  if (!cdnDomain) {
    return originalUrl;
  }


  if (!/^https?:\/\//i.test(cdnDomain)) {
    cdnDomain = `https://${cdnDomain}`;
  }


  const baseCdn = cdnDomain.replace(/\/$/, "");

  const virtualHostPattern = /^https?:\/\/[a-zA-Z0-9.-]+\.s3[a-zA-Z0-9.-]*\.amazonaws\.com\//;
  if (virtualHostPattern.test(originalUrl)) {
    return originalUrl.replace(virtualHostPattern, `${baseCdn}/`);
  }

  const pathStylePattern = /^https?:\/\/s3[.-][a-zA-Z0-9.-]+\.amazonaws\.com\/[a-zA-Z0-9.-]+\//;
  if (pathStylePattern.test(originalUrl)) {
    return originalUrl.replace(pathStylePattern, `${baseCdn}/`);
  }

  return originalUrl;
}
