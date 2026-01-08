import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { s3Client, bucketName } from "./s3Client.js";

export const awsFileBrowser = {
  list: async (path: string) => {
    if (path !== "") {
      path = `${path}/`;
    }
    // Keep only one slash at the end of the path
    path = path.replace(/\/{2,}$/, "/");

    const params = {
      Bucket: bucketName,
      Prefix: path,
      Delimiter: "/",
    };

    const listObjectsCommand = new ListObjectsV2Command(params);
    const data = await s3Client.send(listObjectsCommand);

    const subfolders = data.CommonPrefixes
      ? data.CommonPrefixes.map((commonPrefix) =>
        commonPrefix.Prefix?.replace(path, "").replace(/\/$/, "")
      ).filter((prefix) => prefix !== "")
      : [];

    const files = data.Contents
      ? data.Contents.filter((item) => item.Size !== 0).map((object) => {
        const fileName = object.Key?.split("/").pop();
        // Return relative URL for Evershop compatibility
        return {
          name: fileName,
          url: `/assets/${object.Key}`,
        };
      })
      : [];

    return {
      folders: Array.from(subfolders),
      files,
    };
  },
};
