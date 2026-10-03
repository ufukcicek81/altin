const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: HEADERS
  });
}

/*
 * Türkçe fiyatı doğru sayıya çevirir.
 *
 * 6.550,47  -> 6550.47
 * 6.581,08  -> 6581.08
 * 49,0737   -> 49.0737
 * 49,1791   -> 49.1791
 */
function parsePrice(value) {
  if (value == null) return null;

  let s = String(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, "")
    .trim();

  // Sadece sayı karakterleri
  s = s.replace(/[^\d,.-]/g, "");

  if (!s) return null;

  // Türkçe format: 6.550,47
  if (s.includes(".") && s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  // 49,0737
  else if (s.includes(",")) {
    s = s.replace(",", ".");
  }

  const n = Number(s);

  return Number.isFinite(n) ? n : null;
}

/*
 * cid ve dt aynı element üzerinde hangi sırada
 * bulunursa bulunsun yakalamaya çalışır.
 */
function getCidDt(html, cid, dt) {
  if (!html) return null;

  const patterns = [
    new RegExp(
      `<[^>]*cid=["']${cid}["'][^>]*dt=["']${dt}["'][^>]*>\\s*([^<]+)`,
      "i"
    ),

    new RegExp(
      `<[^>]*dt=["']${dt}["'][^>]*cid=["']${cid}["'][^>]*>\\s*([^<]+)`,
      "i"
    ),

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
    const m = html.match(re);

    if (m && m[1]) {
      const value = parsePrice(m[1]);

      if (value !== null) {
        return value;
      }
    }
  }

  return null;
}

/*
 * HTML yapısındaki değişikliklere karşı ikinci yöntem.
 *
 * cid bulunduğu bölgenin yakınındaki dt değerini ve
 * sonraki sayı değerini arar.
 */
function getCidDtFallback(html, cid, dt) {
  if (!html) return null;

  const cidRe = new RegExp(
    `cid=["']${cid}["']`,
    "i"
  );

  const cidMatch = cidRe.exec(html);

  if (!cidMatch) return null;

  const start = Math.max(0, cidMatch.index - 1000);
  const end = Math.min(html.length, cidMatch.index + 3000);

  const block = html.slice(start, end);

  const dtRe = new RegExp(
    `dt=["']${dt}["']`,
    "i"
  );

  const dtMatch = dtRe.exec(block);

  if (!dtMatch) return null;

  /*
   * dt alanından sonraki 200 karakter içinde
   * ilk fiyat benzeri değeri bul.
   */
  const after = block.slice(dtMatch.index);

  const priceMatch = after.match(
    /(?:>|["':])\s*([0-9]{1,3}(?:[.\s][0-9]{3})*(?:,[0-9]{1,6})?|[0-9]+(?:,[0-9]{1,6})?)/i
  );

  if (!priceMatch) return null;

  return parsePrice(priceMatch[1]);
}

function getPrice(html, cid, dt) {
  return (
    getCidDt(html, cid, dt) ??
    getCidDtFallback(html, cid, dt)
  );
}

/*
 * HAS için güvenlik kontrolü.
 *
 * HAS yaklaşık 6.000+ TL seviyesinde olduğu için
 * 6.59 gibi yanlış parse edilmiş değerleri reddediyoruz.
 */
function validHas(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 3000 &&
    value <= 20000
  );
}

function validCurrency(value) {
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
        headers: HEADERS
      });
    }

    try {

      const [hasRes, currencyRes] = await Promise.all([

        fetch(
          "https://canlidoviz.com/altin-fiyatlari/kapali-carsi/has-altin",
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",
              "Accept":
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Referer": "https://canlidoviz.com/"
            },
            cf: {
              cacheEverything: false,
              cacheTtl: 0
            }
          }
        ),

        fetch(
          "https://canlidoviz.com/doviz-kurlari",
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",
              "Accept":
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Referer": "https://canlidoviz.com/"
            },
            cf: {
              cacheEverything: false,
              cacheTtl: 0
            }
          }
        )
      ]);

      if (!hasRes.ok) {
        return json({
          error: "HAS kaynağına ulaşılamadı",
          status: hasRes.status
        }, 502);
      }

      if (!currencyRes.ok) {
        return json({
          error: "Döviz kaynağına ulaşılamadı",
          status: currencyRes.status
        }, 502);
      }

      const hasHtml = await hasRes.text();
      const currencyHtml = await currencyRes.text();

      /*
       * HAS ALTIN
       * cid = 1186
       */
      const hasAlisRaw =
        getPrice(hasHtml, "1186", "bA");

      const hasSatisRaw =
        getPrice(hasHtml, "1186", "amount");

      /*
       * DÖVİZLER
       */
      const usdAlis =
        getPrice(currencyHtml, "1", "bA");

      const usdSatis =
        getPrice(currencyHtml, "1", "amount");

      const eurAlis =
        getPrice(currencyHtml, "50", "bA");

      const eurSatis =
        getPrice(currencyHtml, "50", "amount");

      const gbpAlis =
        getPrice(currencyHtml, "100", "bA");

      const gbpSatis =
        getPrice(currencyHtml, "100", "amount");

      const sarAlis =
        getPrice(currencyHtml, "61", "bA");

      const sarSatis =
        getPrice(currencyHtml, "61", "amount");

      const chfAlis =
        getPrice(currencyHtml, "51", "bA");

      const chfSatis =
        getPrice(currencyHtml, "51", "amount");

      /*
       * HAS'TA KESİNLİKLE HESAPLAMA YOK.
       * Kaynakta ne varsa onu kullanıyoruz.
       */
      const hasAlis =
        validHas(hasAlisRaw)
          ? hasAlisRaw
          : null;

      const hasSatis =
        validHas(hasSatisRaw)
          ? hasSatisRaw
          : null;

      const result = {
        hasAlis,
        hasSatis,

        usdAlis:
          validCurrency(usdAlis)
            ? usdAlis
            : null,

        usdSatis:
          validCurrency(usdSatis)
            ? usdSatis
            : null,

        eurAlis:
          validCurrency(eurAlis)
            ? eurAlis
            : null,

        eurSatis:
          validCurrency(eurSatis)
            ? eurSatis
            : null,

        gbpAlis:
          validCurrency(gbpAlis)
            ? gbpAlis
            : null,

        gbpSatis:
          validCurrency(gbpSatis)
            ? gbpSatis
            : null,

        sarAlis:
          validCurrency(sarAlis)
            ? sarAlis
            : null,

        sarSatis:
          validCurrency(sarSatis)
            ? sarSatis
            : null,

        chfAlis:
          validCurrency(chfAlis)
            ? chfAlis
            : null,

        chfSatis:
          validCurrency(chfSatis)
            ? chfSatis
            : null,

        source: "canlidoviz",
        updatedAt: new Date().toISOString()
      };

      /*
       * HAS hiç bulunamadıysa yanlış fiyat göstermiyoruz.
       */
      if (
        result.hasAlis === null &&
        result.hasSatis === null
      ) {
        return json({
          error:
            "HAS alış ve satış fiyatı kaynak HTML'de bulunamadı",
          source: "canlidoviz"
        }, 502);
      }

      return json(result);

    } catch (error) {

      return json({
        error:
          error?.message ||
          "Bilinmeyen fiyat servisi hatası"
      }, 500);

    }
  }
};
