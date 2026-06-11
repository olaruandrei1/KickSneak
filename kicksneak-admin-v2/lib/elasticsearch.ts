import prisma from "./prisma";

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || "http://localhost:9200";
const INDEX_NAME = "kicksneak-products";

export async function indexProduct(productId: string) {
  try {
    const product = await prisma.products.findUnique({
      where: { Id: productId },
      include: {
        brands: true,
        categories: true,
        colors: true,
        materials: true,
        genders: true,
        fits: true,
        product_photos: {
          where: { IsDeleted: false }
        },
        stock_items: {
          where: { IsDeleted: false }
        }
      }
    });

    if (!product) return;

    // Calculate LowestAsk (Active items have StatusItem = 1)
    const activeStock = product.stock_items.filter(s => s.StatusItem === 1);
    const lowestAsk = activeStock.length > 0 ? Math.min(...activeStock.map(s => s.Price)) : 0;

    // Calculate SoldCount (Sold items have StatusItem = 2)
    const soldCount = product.stock_items.filter(s => s.StatusItem === 2).length;

    // IsNew = ReleaseDate >= 3 months ago
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const isNew = product.ReleaseDate ? new Date(product.ReleaseDate) >= threeMonthsAgo : false;

    const doc = {
      Id: product.Id,
      Title: product.Title || "",
      Brand: product.brands?.Name || "",
      Category: product.categories?.Name || "",
      Color: product.colors?.Name || "",
      Material: product.materials?.Name || "",
      Gender: product.genders?.Name || "",
      Fit: product.fits?.Name || "",
      RetailPrice: product.RetailPrice || 0,
      LowestAsk: lowestAsk,
      Image: product.product_photos.find(ph => ph.IsPrimary)?.PhotoUrl || "",
      ProductUniversalId: product.ProductUniversalId || "",
      ShortDescription: product.ShortDescription || "",
      SoldCount: soldCount,
      IsNew: isNew,
      ReleaseDate: product.ReleaseDate ? product.ReleaseDate.toISOString() : null,
      IndexedAt: new Date().toISOString()
    };

    const res = await fetch(`${ELASTICSEARCH_URL}/${INDEX_NAME}/_doc/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc),
    });

    if (!res.ok) {
      console.warn(`Failed to index product ${productId} in ElasticSearch: Status ${res.status}`);
    } else {
      console.log(`Successfully indexed product ${productId} in ElasticSearch`);
    }
  } catch (error: any) {
    console.warn("Elasticsearch is offline or connection failed. Skipping indexing:", error.message || error);
  }
}

export async function deleteProductFromIndex(productId: string) {
  try {
    const res = await fetch(`${ELASTICSEARCH_URL}/${INDEX_NAME}/_doc/${productId}`, {
      method: "DELETE"
    });

    if (!res.ok && res.status !== 404) {
      console.warn(`Failed to delete product ${productId} from ElasticSearch: Status ${res.status}`);
    } else {
      console.log(`Successfully deleted product ${productId} from ElasticSearch`);
    }
  } catch (error: any) {
    console.warn("Elasticsearch is offline or connection failed. Skipping delete:", error.message || error);
  }
}
