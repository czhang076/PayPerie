import * as dotenv from 'dotenv';
dotenv.config();
function getEnv(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`❌ ERROR: NO ENVIRONMENT VARIABLES ${key}, CHECK .env FILE PLEASE!`);
    }
    return value;
}
export const config = {
    port: process.env.PORT || 3000,
    merchant: {
        address: getEnv('MERCHANT_WALLET_ADDRESS'),
        acceptedToken: getEnv('ACCEPTED_TOKEN_ADDRESS'),
        chainId: 43113
    }
};
//# sourceMappingURL=env.js.map