import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, bucketName } from "./s3Client.js";

export const awsFolderCreator = {
  create: async (path: string) => {
    // Make sure path is not empty and has only 1 trailing slash at the end
    const requestedPath = path ? path.replace(/\/+$/, "") : "";
    if (!requestedPath) {
      throw new Error("Path is empty");
    } else {
      const params = {
        Bucket: bucketName,
        Key: `${requestedPath}/`, // Folders in S3 should end with /
      };

      const uploadCommand = new PutObjectCommand(params);
      await s3Client.send(uploadCommand);
    }
  },
};
