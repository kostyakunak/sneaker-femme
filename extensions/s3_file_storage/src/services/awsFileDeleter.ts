import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, bucketName } from "./s3Client.js";

export const awsFileDeleter = {
  delete: async (path: string) => {
    const params = {
      Bucket: bucketName,
      Key: path,
    };
    const headObjectCommand = new HeadObjectCommand(params);
    await s3Client.send(headObjectCommand);
    const deleteObjectCommand = new DeleteObjectCommand(params);
    await s3Client.send(deleteObjectCommand);
  },
};
