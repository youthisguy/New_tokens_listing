const axios = require('axios');

async function fetchData() {
    const url = 'https://api.geckoterminal.com/api/v2/networks/ton/new_pools?include=dex%2C%20base_token%2C%20quote_token';
    try {
        const response = await axios.get(url, {
            headers: {
                'accept': 'application/json',
            },
        });
        const responseData = response.data;
        // Filter items where liquidity is greater than $1000 and get the latest
        const filteredItems = responseData.data
            .filter(item => parseFloat(item.attributes.reserve_in_usd) > 1000)
            .slice(0, 1)
            .map(item => ({
                base_token_address: item.relationships.base_token.data.id.replace('ton_', ''),
                pool_marketcap: item.attributes.market_cap_usd,
                base_dex: item.relationships.dex.data.id,
                day_hours_buys: item.attributes.transactions.h24.buys,
                day_hours_sells: item.attributes.transactions.h24.sells,
                base_token_price_usd: item.attributes.base_token_price_usd,
                pool_address: item.attributes.address,
                name: item.attributes.name,
                pool_created_at: item.attributes.pool_created_at,
                fdv_usd: item.attributes.fdv_usd,
                price_change_percentage_h24: item.attributes.price_change_percentage.h24,
                reserve_in_usd: item.attributes.reserve_in_usd,
                volume_usd_h24: item.attributes.volume_usd.h24,
            }));
        return filteredItems;
    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
}

module.exports = { fetchData };
