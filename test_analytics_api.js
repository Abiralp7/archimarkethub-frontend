// Quick test to see what the analytics API returns
const response = { 
  items: [
    { entityId: "prod-1", count: 10 },
    { entityId: "prod-2", count: 8 }
  ]
};

// Or it might return an array directly:
// const response = [
//   { entityId: "prod-1", count: 10 },
//   { entityId: "prod-2", count: 8 }
// ];

const raw = response?.items ?? response?.data ?? response ?? [];
console.log("Raw:", JSON.stringify(raw, null, 2));

const productMap = new Map([
  ["prod-1", "Product One"],
  ["prod-2", "Product Two"]
]);

const rows = (Array.isArray(raw) ? raw : []).map((item) => {
  const entityId = item.entityId || item.id || item.name || '';
  const count = item.count || item.views || 0;
  return {
    name: productMap.get(entityId) || entityId,
    views: count,
    trend: 0,
  };
});

console.log("Result:", JSON.stringify(rows, null, 2));
