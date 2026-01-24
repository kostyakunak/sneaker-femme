export default {
  Product: {
    price: (product) => {
      // console.log('DEBUG: Product resolver price:', product.sku, product.product_id, product.price);
      const price = parseFloat(product.price);
      return {
        regular: price,
        special: price // TODO: implement special price
      };
    }
  }
};
