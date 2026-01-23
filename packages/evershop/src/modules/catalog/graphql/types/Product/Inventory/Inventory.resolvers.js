export default {
  Product: {
    inventory: async (product) => ({
      ...product,
      qty: parseInt(product.qty, 10),
      isInStock:
        (parseInt(product.qty, 10) > 0 && product.stockAvailability === true) ||
        product.manageStock === false,
      stockAvailability: product.stockAvailability === true ? 1 : 0,
      manageStock: product.manageStock === true ? 1 : 0
    })
  }
};
