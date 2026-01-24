import { setContextValue } from "@evershop/evershop/graphql/services";

export default (request, response) => {
    setContextValue(request, "pageInfo", {
        title: "Supplier Dashboard",
        description: "Overview of supplier sync activities and KPIs.",
    });
};
