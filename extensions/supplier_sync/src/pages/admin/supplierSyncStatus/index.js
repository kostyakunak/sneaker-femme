import { setContextValue } from "@evershop/evershop/graphql/services";

export default (request, response) => {
    setContextValue(request, "pageInfo", {
        title: "Supplier Sync Status",
        description: "Monitor and manage supplier product and order synchronization.",
    });
};
