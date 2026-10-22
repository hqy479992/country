import "dotenv/config";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  adminAccessKey: process.env.ADMIN_ACCESS_KEY || "",
  staffAccessKeys: JSON.parse(process.env.STAFF_ACCESS_KEYS || "{}") as Record<
    string,
    string
  >,
  mockPaymentEnabled: process.env.MOCK_PAYMENT_ENABLED === "true",
};
