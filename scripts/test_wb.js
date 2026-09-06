const https = require('https');

function getWbBasketNumber(vol) {
  if (vol >= 0 && vol <= 143) return '01';
  if (vol <= 287) return '02';
  if (vol <= 431) return '03';
  if (vol <= 719) return '04';
  if (vol <= 1007) return '05';
  if (vol <= 1061) return '06';
  if (vol <= 1115) return '07';
  if (vol <= 1169) return '08';
  if (vol <= 1313) return '09';
  if (vol <= 1601) return '10';
  if (vol <= 1655) return '11';
  if (vol <= 1919) return '12';
  if (vol <= 2045) return '13';
  if (vol <= 2189) return '14';
  if (vol <= 2405) return '15';
  if (vol <= 2621) return '16';
  if (vol <= 2837) return '17';
  if (vol <= 3053) return '18';
  if (vol <= 3269) return '19';
  if (vol <= 3485) return '20';
  if (vol <= 3701) return '21';
  if (vol <= 3917) return '22';
  if (vol <= 4133) return '23';
  if (vol <= 4349) return '24';
  return '25';
}

function getWbCardInfoUrl(id) {
  const vol = Math.floor(id / 100000);
  const part = Math.floor(id / 1000);
  const basket = getWbBasketNumber(vol);
  return `https://basket-${basket}.wbbasket.ru/vol${vol}/part${part}/${id}/info/ru/card.json`;
}

function getWbImageUrl(id, index = 1) {
  const vol = Math.floor(id / 100000);
  const part = Math.floor(id / 1000);
  const basket = getWbBasketNumber(vol);
  return `https://basket-${basket}.wbbasket.ru/vol${vol}/part${part}/${id}/images/big/${index}.webp`;
}

async function run() {
  const id = 164976723;
  const cardUrl = getWbCardInfoUrl(id);
  const imgUrl = getWbImageUrl(id, 1);
  console.log('Card URL:', cardUrl);
  console.log('Image 1 URL:', imgUrl);

  https.get(cardUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  }, (res) => {
    console.log('Status:', res.statusCode);
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('Title/Desc:', json.description?.slice(0, 150));
        console.log('Options count:', json.options?.length);
        console.log('Sample option:', json.options?.[0]);
      } catch(e) {
        console.log('Parse error:', data.slice(0, 200));
      }
    });
  });
}
run();
