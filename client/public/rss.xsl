<?xml version="1.0" encoding="UTF-8"?>
<!--
  What a person sees when they open the blog's RSS feed (/blog/feed.xml) in a
  browser: the same XML a feed reader gets, laid out as a page that says what
  it is and how to use it. Feed readers ignore this stylesheet. A browser that
  no longer runs XSLT simply shows the raw XML, as before.
-->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:atom="http://www.w3.org/2005/Atom"
  exclude-result-prefixes="dc atom">
  <xsl:output method="html" version="5.0" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <title><xsl:value-of select="/rss/channel/title" /> · RSS feed</title>
        <link rel="icon" href="/logo.svg" />
        <style>
          :root {
            --bg: #ffffff; --fg: #0b0b0c; --muted: #6b6b70; --line: #ececee; --card: #f7f7f8;
            --accent: #2453e6; --accent-soft: rgba(36, 83, 230, 0.08);
            color-scheme: light dark;
          }
          @media (prefers-color-scheme: dark) {
            :root { --bg: #161616; --fg: #f5f5f5; --muted: #a3a3a8; --line: #2a2a2c; --card: #1e1e20; --accent: #5b8cff; --accent-soft: rgba(91, 140, 255, 0.12); }
          }
          * { box-sizing: border-box; }
          body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
          main { max-width: 44rem; margin: 0 auto; padding: 3.5rem 1.25rem 5rem; }
          a { color: inherit; }
          .brand { display: inline-flex; align-items: center; gap: .5rem; font-weight: 600; text-decoration: none; }
          .brand img { width: 26px; height: 26px; }
          h1 { margin: 2.25rem 0 .5rem; font-size: clamp(1.9rem, 5vw, 2.6rem); line-height: 1.15; font-weight: 500; letter-spacing: -0.03em; }
          .lede { margin: 0; color: var(--muted); }
          .note { margin-top: 2rem; padding: 1.1rem 1.25rem; border-radius: 16px; background: var(--accent-soft); }
          .note p { margin: 0; font-size: .95rem; }
          .note strong { font-weight: 600; }
          .row { display: flex; gap: .5rem; margin-top: .85rem; }
          .row code { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: .55rem .8rem; border-radius: 10px; background: var(--bg); border: 1px solid var(--line); font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; }
          .row button { flex: none; padding: 0 1rem; border: 0; border-radius: 999px; background: var(--accent); color: #fff; font: inherit; font-size: .875rem; font-weight: 500; cursor: pointer; transition: opacity .2s; }
          .row button:hover { opacity: .9; }
          h2 { margin: 3rem 0 .25rem; font-size: .8rem; font-weight: 500; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
          ol { list-style: none; margin: 0; padding: 0; }
          li { padding: 1.4rem 0; border-bottom: 1px solid var(--line); }
          li a.title { font-size: 1.15rem; font-weight: 500; letter-spacing: -0.01em; text-decoration: none; transition: color .3s; }
          li a.title:hover { color: var(--accent); }
          .meta { margin-top: .2rem; font-size: .85rem; color: var(--muted); }
          .desc { margin: .5rem 0 0; color: var(--muted); }
          .back { display: inline-block; margin-top: 2.5rem; font-size: .9rem; color: var(--accent); text-decoration: none; }
        </style>
      </head>
      <body>
        <main>
          <a class="brand" href="/"><img src="/logo.svg" alt="" />Savedly</a>

          <h1><xsl:value-of select="/rss/channel/title" /></h1>
          <p class="lede"><xsl:value-of select="/rss/channel/description" /></p>

          <div class="note">
            <p><strong>This is an RSS feed.</strong> Add its address to a feed reader, such as Feedly, Inoreader or NetNewsWire, and new posts come to you as they're published.</p>
            <div class="row">
              <code id="feed-url"><xsl:value-of select="/rss/channel/atom:link/@href" /></code>
              <button type="button" id="copy">Copy</button>
            </div>
          </div>

          <h2>Latest posts</h2>
          <ol>
            <xsl:for-each select="/rss/channel/item">
              <li>
                <a class="title" href="{link}"><xsl:value-of select="title" /></a>
                <div class="meta">
                  <xsl:if test="pubDate"><xsl:value-of select="substring(pubDate, 6, 11)" /></xsl:if>
                  <xsl:if test="dc:creator"> · <xsl:value-of select="dc:creator" /></xsl:if>
                </div>
                <xsl:if test="description"><p class="desc"><xsl:value-of select="description" /></p></xsl:if>
              </li>
            </xsl:for-each>
          </ol>

          <a class="back" href="/blog">Read the blog →</a>
        </main>
        <script>
          document.getElementById("copy").addEventListener("click", function () {
            var button = this;
            var text = document.getElementById("feed-url").textContent;
            navigator.clipboard.writeText(text).then(function () {
              button.textContent = "Copied";
              setTimeout(function () { button.textContent = "Copy"; }, 1600);
            });
          });
        </script>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
