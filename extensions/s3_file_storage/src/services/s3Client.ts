import { S3Client } from "@aws-sdk/client-s3";
import { getEnv } from "@evershop/evershop/lib/util/getEnv";

const s3Endpoint = getEnv("AWS_S3_ENDPOINT");
const forcePathStyle = getEnv("AWS_S3_FORCE_PATH_STYLE") === "true";
const region = getEnv("AWS_REGION") || "us-east-1";

export const s3Client = new S3Client({
    region,
    endpoint: s3Endpoint || undefined,
    forcePathStyle: forcePathStyle,
    credentials: {
        accessKeyId: getEnv("AWS_ACCESS_KEY_ID"),
        secretAccessKey: getEnv("AWS_SECRET_ACCESS_KEY"),
    },
});

export const bucketName = getEnv("AWS_BUCKET_NAME");
export const s3PublicBaseUrl = getEnv("S3_PUBLIC_BASE_URL");
