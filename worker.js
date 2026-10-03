const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS
  });
}

function parsePrice(value) {
  if (value == null) return null;

  let s = String(value).trim();

  // HTML içindeki gereksiz karakterleri temizle
  s = s.replace(/&nbsp;/gi, " ");
  s = s.replace(/\s+/g, "");
  s = s.replace(/[^\d.,-]/g, "");

  if (!s) return null;

  /*
   * Türkçe sayı formatı:
   * 6.500,25 -> 6500.25
   *
   * Nokta binlik, virgül ondalık kabul edilir.
   */
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }

  const n = Number(s);

  if (!Number.isFinite(n)) return null;

  return n;
}

function getCidDt(html, cid, dt) {
  if (!html) return null;

  /*
   * cid ve dt'nin HTML'de yan yana bulunmasına
   * veya boşluk miktarına bağımlı değiliz.
   */
  const patterns = [
    new RegExp(
      `cid=["']${cid}["'][^>]*dt=["']${dt}["'][^>]*>\\s*([^<]+)`,
      "i"
    ),
    new RegExp(
      `dt=["']${dt}["'][^>]*cid=["']${cid}["'][^>]*>\\s*([^<]+)`,
      "i"
    )
  ];

  for (const re of patterns) {
    const match = html.match(re);

    if (match && match[1]) {
      const price = parsePrice(match[1]);

      if (price !== null) {
        return price;
      }
    }
  }

  return null;
}

/*
 * Fiyatın gerçekten makul olup olmadığını kontrol ediyoruz.
 *
 * Özellikle HAS'ta 6.59 gibi hatalı parse edilmiş değerlerin
 * sisteme girmesini engelliyoruz.
 *
 * Burada fiyatı değiştirmiyoruz veya hesaplamıyoruz.
 * Sadece bariz hatalı veriyi reddediyoruz.
 */
function validHasPrice(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 1000 &&
    value <= 100000
  );
}

function validCurrencyPrice(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value < 1000000
  );
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    try {
      const [hasResponse, currencyResponse] = await Promise.all([
        fetch(
          "https://canlidoviz.com/altin-fiyatlari/kapali-carsi/has-altin",
          {
            method: "GET",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",
              Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              Referer: "https://canlidoviz.com/"
            },
            cf: {
              cacheEverything: false,
              cacheTtl: 0
            }
          }
        ),

        fetch("https://canlidoviz.com/doviz-kurlari", {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            Referer: "https://canlidoviz.com/"
          },
          cf: {
            cacheEverything: false,
            cacheTtl: 0
          }
        })
      ]);

      if (!hasResponse.ok) {
        return response(
          {
            error: "HAS kaynağına ulaşılamadı",
            status: hasResponse.status
          },
          502
        );
      }

      if (!currencyResponse.ok) {
        return response(
          {
            error: "Döviz kaynağına ulaşılamadı",
            status: currencyResponse.status
          },
          502
        );
      }

      const [hasHtml, currencyHtml] = await Promise.all([
        hasResponse.text(),
        currencyResponse.text()
      ]);

      /*
       * HAS
       * cid 1186 = HAS ALTIN
       *
       * bA      = alış
       * amount  = satış
       */
      const hasAlisRaw = getCidDt(hasHtml, "1186", "bA");
      const hasSatisRaw = getCidDt(hasHtml, "1186", "amount");

      /*
       * Döviz
       */
      const usdAlis = getCidDt(currencyHtml, "1", "bA");
      const usdSatis = getCidDt(currencyHtml, "1", "amount");

      const eurAlis = getCidDt(currencyHtml, "50", "bA");
      const eurSatis = getCidDt(currencyHtml, "50", "amount");

      const gbpAlis = getCidDt(currencyHtml, "100", "bA");
      const gbpSatis = getCidDt(currencyHtml, "100", "amount");

      const sarAlis = getCidDt(currencyHtml, "61", "bA");
      const sarSatis = getCidDt(currencyHtml, "61", "amount");

      const chfAlis = getCidDt(currencyHtml, "51", "bA");
      const chfSatis = getCidDt(currencyHtml, "51", "amount");

      /*
       * HAS için kesinlikle hesaplama yapmıyoruz.
       *
       * Sadece kaynakta gelen gerçek değerleri kullanıyoruz.
       * 6.59 gibi bariz hatalı değerler null olur.
       */
      const hasAlis = validHasPrice(hasAlisRaw)
        ? hasAlisRaw
        : null;

      const hasSatis = validHasPrice(hasSatisRaw)
        ? hasSatisRaw
        : null;

      const result = {
        hasAlis,
        hasSatis,

        usdAlis: validCurrencyPrice(usdAlis) ? usdAlis : null,
        usdSatis: validCurrencyPrice(usdSatis) ? usdSatis : null,

        eurAlis: validCurrencyPrice(eurAlis) ? eurAlis : null,
        eurSatis: validCurrencyPrice(eurSatis) ? eurSatis : null,

        gbpAlis: validCurrencyPrice(gbpAlis) ? gbpAlis : null,
        gbpSatis: validCurrencyPrice(gbpSatis) ? gbpSatis : null,

        sarAlis: validCurrencyPrice(sarAlis) ? sarAlis : null,
        sarSatis: validCurrencyPrice(sarSatis) ? sarSatis : null,

        chfAlis: validCurrencyPrice(chfAlis) ? chfAlis : null,
        chfSatis: validCurrencyPrice(chfSatis) ? chfSatis : null,

        source: "canlidoviz",
        updatedAt: new Date().toISOString()
      };

      /*
       * HAS'ın ikisi de yoksa uygulamaya başarılı cevap
       * vermiyoruz. Böylece yanlış fiyat gösterilmez.
       */
      if (result.hasAlis === null && result.hasSatis === null) {
        return response(
          {
            error: "HAS alış/satış fiyatı kaynakta bulunamadı",
            source: "canlidoviz"
          },
          502
        );
      }

      return response(result, 200);
    } catch (error) {
      return response(
        {
          error: error?.message || "Fiyat servisi hatası"
        },
        500
      );
    }
  }
};
