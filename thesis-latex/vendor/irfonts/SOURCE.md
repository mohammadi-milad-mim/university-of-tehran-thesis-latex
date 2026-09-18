# IRNazanin font provenance

The active Persian typeface is the standardized `IRNazanin` family from the [farsi-fonts/IRFonts](https://github.com/farsi-fonts/IRFonts) repository, pinned at commit `18ddafe9572499818d6ff647f7b31b2872814f82`.

That upstream project describes IRFonts as standardized Persian/Arabic fonts originally sponsored by Iran's Supreme Council of Information and Communication Technology, designed by Hossein Zahedi in 2013, acquired by the Information Technology Organization of Iran, and released under the SIL Open Font License in 2022.

Pinned files:

| Face | Upstream file | SHA-256 |
| --- | --- | --- |
| Regular | `ttf/IRNazanin.ttf` | `05e84eec4ca0ff8a1bd9aa9588d6100ef5b7533b9eab279ea5e7433825a707e3` |
| Bold | `ttf/IRNazanin-Bold.ttf` | `69f47783289acac64bf777cddede7d6eefb82b58aed6d901399df8179868efe1` |
| Italic | `ttf/IRNazanin-Italic.ttf` | `ec89c23ecbc769b46a1d0e8c4449abd48b424c45cf3bfd8c1e81a3abfaa93e66` |

All three identify family `IRNazanin`, version `1.000`, modifier/designer Hossein Zahedi, and the 2022 Information Technology Organization of Iran copyright in their SFNT metadata. The regular face contains Persian `ی` and `ک`, Persian digits, ZWNJ, both decomposed and precomposed heh-with-yeh-above forms, and substantially broader Perso-Arabic Unicode coverage than the old B Nazanin file.

`OFL-IRNazanin.txt` is copied unchanged from the same upstream commit. The fonts are loaded by file path, so the build does not depend on a user's locally installed Persian fonts.
