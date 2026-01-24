import { setContextValue } from "@evershop/evershop/graphql/services";

export default (request, response) => {
    setContextValue(request, "pageInfo", {
        title: "Import Product",
        description: "Import products directly from supplier by SKU or URL.",
    });
};
