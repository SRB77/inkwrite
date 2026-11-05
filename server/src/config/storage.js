const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const cfg = {
  endpoint: process.env.NEON_STORAGE_ENDPOINT,
  region: process.env.NEON_STORAGE_REGION,
  accessKeyId: process.env.NEON_STORAGE_ACCESS_KEY_ID,
  secretAccessKey: process.env.NEON_STORAGE_SECRET_ACCESS_KEY,
  bucket: process.env.NEON_STORAGE_BUCKET,
};

const enabled = Boolean(
  cfg.endpoint &&
  cfg.region &&
  cfg.accessKeyId &&
  cfg.secretAccessKey &&
  cfg.bucket,
);

let client = null;
if (enabled) {
  client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
  console.log(`Neon Object Storage enabled (bucket: ${cfg.bucket})`);
}

const isEnabled = () => enabled;

const putObject = async (key, buffer, contentType) => {
  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=3600",
    }),
  );
  return `${cfg.endpoint.replace(/\/$/, "")}/${cfg.bucket}/${key}`;
};

const getReadUrl = async (key, expiresIn = 3600) => {
  if (!enabled || !key) return null;
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: cfg.bucket, Key: key }),
    { expiresIn },
  );
};

const deleteObject = async (key) => {
  await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
};

const keyFromUrl = (url) => {
  const marker = `/${cfg.bucket}/`;
  const i = typeof url === "string" ? url.indexOf(marker) : -1;
  return i === -1 ? null : url.slice(i + marker.length).split("?")[0];
};

module.exports = {
  isEnabled,
  putObject,
  getReadUrl,
  deleteObject,
  keyFromUrl,
  bucket: cfg.bucket,
};
