import { PutObjectCommand } from "@aws-sdk/client-s3";
import { UploadedFile } from "@evershop/evershop/cms/services";
import { s3Client, bucketName } from "./s3Client.js";

export const awsFileUploader = {
  upload: async (files: Express.Multer.File[], requestedPath: string) => {
    const uploadedFiles: UploadedFile[] = [];
    const uploadPromises: Promise<any>[] = [];

    for (const file of files) {
      const fileName = requestedPath
        ? `${requestedPath}/${file.filename}`.replace(/\/+/g, '/')
        : file.filename;

      const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      const uploadCommand = new PutObjectCommand(params);
      uploadPromises.push(s3Client.send(uploadCommand));
    }

    await Promise.all(uploadPromises);

    files.forEach((file) => {
      const key = requestedPath
        ? `${requestedPath}/${file.filename}`.replace(/\/+/g, '/')
        : file.filename;

      uploadedFiles.push({
        name: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        url: `/assets/${key}`,
      });
    });

    return uploadedFiles;
  },
};
