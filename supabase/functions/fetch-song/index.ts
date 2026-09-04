import { parseCifraHtml } from './_parser.js'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceKey = Deno.env.get('SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

const CC_HEADERS = {
  'User-Agent': UA,
  'Accept-Language': 'pt-BR,pt;q=0.9',
  Accept: 'text/html,application/xhtml+xml'
}

// Palavras de ligação — não fazem parte do nome do artista nem do título da música.
const STOP = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das', 'no', 'na',
  'nos', 'nas', 'em', 'e', 'ou', 'para', 'pra', 'pro', 'pras', 'pelo', 'pela', 'pelos', 'pelas',
  'the', 'an', 'of', 'to', 'for', 'and', 'in', 'on', 'at', 'my', 'me', 'your', 'you', 'minha',
  'meu', 'sua', 'seu', 'essa', 'esse', 'com', 'sem', 'que', 'tem', 'voce', 'quero', 'cifra',
  'letra', 'tocar', 'musica', 'part', 'feat', 'ft', 'ao', 'aos'
])

function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Se já veio um slug (ex.: "me-ama-"), não corta o hífen final.
function asSlug(text) {
  const raw = String(text || '').trim()
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*-?$/.test(raw)) return raw
  return slugify(raw)
}

function slugArtistVariants(text) {
  const raw = asSlug(text)
  const base = slugify(raw)
  return [...new Set([raw, base].filter(Boolean))]
}

function slugTitleVariants(text) {
  const raw = asSlug(text)
  const base = slugify(raw)
  return [...new Set([raw, base, base ? `${base}-` : ''].filter(Boolean))]
}

function escReg(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function tokenize(q) {
  return String(q || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase())
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Extrai [artista, música] do path de uma URL final do Cifra Club.
function slugPairFromUrl(url) {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    if (parts[parts.length - 1]?.endsWith('.html')) parts.pop()
    if (parts.length >= 2) return [parts[0], parts[1]]
  } catch {}
  return null
}

function firstSegFromUrl(url) {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    return parts[0] || null
  } catch {
    return null
  }
}

async function fetchCc(path) {
  // Pequena pausa entre requisições ao Cifra Club para não levar bloqueio.
  await sleep(180)
  const res = await fetch(`https://www.cifraclub.com.br/${path}`, {
    headers: CC_HEADERS,
    redirect: 'follow'
  })
  if (res.status === 404) return { ok: false, status: 404 }
  if (!res.ok) return { ok: false, status: res.status }
  return { ok: true, html: await res.text(), finalUrl: res.url || '' }
}

function youtubeIdsFrom(html) {
  const ids = []
  const re = /youtubeID\\*":\\*"([A-Za-z0-9_-]{6,})/g
  let m
  while ((m = re.exec(html))) ids.push(m[1])
  return [...new Set(ids)]
}

async function upsertSong(client, song) {
  const { data, error } = await client
    .from('songs')
    .upsert(song, { onConflict: 'slug_artist,slug_title,version' })
    .select('*')
    .single()
  if (error) throw error
  return data
}

function decodeRow(row) {
  if (!row) return row
  try {
    return { ...row, content: JSON.parse(row.content) }
  } catch {
    return row
  }
}

function cifraUrls(slugArtist, slugTitle, version) {
  const isSimplificada = version === 'simplificada'
  const artists = slugArtistVariants(slugArtist)
  const titles = slugTitleVariants(slugTitle)
  const urls = []
  const seen = new Set()
  for (const a of artists) {
    for (const t of titles) {
      const url = isSimplificada
        ? `https://www.cifraclub.com.br/${a}/${t}/simplificada.html`
        : `https://www.cifraclub.com.br/${a}/${t}/`
      if (seen.has(url)) continue
      seen.add(url)
      urls.push(url)
    }
  }
  return urls
}

async function scrapeSong({ slugArtist, slugTitle, version, resolved }) {
  const isSimplificada = version === 'simplificada'
  const urls = cifraUrls(slugArtist, slugTitle, version)
  let res = null
  let url = urls[0]
  for (const candidate of urls) {
    url = candidate
    res = await fetch(candidate, {
      headers: CC_HEADERS,
      redirect: 'follow'
    })
    if (res.ok) break
    if (res.status !== 404) break
  }

  if (!res || res.status === 404) {
    if (resolved) {
      const err = new Error(
        isSimplificada
          ? 'Esta música não tem versão simplificada no Cifra Club.'
          : 'Não encontramos essa música no Cifra Club. Confira o artista e o título.'
      )
      err.status = 404
      throw err
    }
    const artistSlug = asSlug(slugArtist)
    const page = await fetchCc(`${artistSlug}/`)
    if (page.ok) {
      const realArtist = firstSegFromUrl(page.finalUrl) || artistSlug
      const tokens = tokenize(String(slugTitle).replace(/-/g, ' '))
      let found = matchSongSlug(page.html, realArtist, tokens)
      if (!found) {
        const all = await fetchCc(`${realArtist}/musicas.html`)
        if (all.ok) found = matchSongSlug(all.html, realArtist, tokens)
      }
      if (found) {
        return scrapeSong({ slugArtist: realArtist, slugTitle: found, version, resolved: true })
      }
    }
    const err = new Error(
      isSimplificada
        ? 'Esta música não tem versão simplificada no Cifra Club.'
        : 'Não encontramos essa música no Cifra Club. Confira o artista e o título.'
    )
    err.status = 404
    throw err
  }
  if (!res.ok) {
    const err = new Error('O Cifra Club não respondeu agora. Tente de novo em instantes.')
    err.status = res.status
    throw err
  }

  const html = await res.text()
  if (!html.includes('data-chord-content="true"')) {
    const err = new Error('Não encontramos a cifra dessa música. Confira o artista e o título.')
    err.status = 404
    throw err
  }

  // Usa o slug canônico da URL final (o Cifra Club pode redirecionar,
  // ex.: "/diante-do-trono/me-ama" -> "/diante-do-trono/me-ama-/").
  const canon = slugPairFromUrl(res.url)
  if (canon) {
    slugArtist = canon[0]
    slugTitle = canon[1]
  }

  const { lines, tuning, toneRoot } = parseCifraHtml(html)

  // título/artista a partir dos metadados da página
  const nameMatch = html.match(/"name":"([^"]+) - ([^"]+)"/)
  let artist = nameMatch?.[1] || null
  let title = nameMatch?.[2] || null

  const imgMatch = html.match(/"image":"([^"]+\.jpg)"/)
  const imageUrl = imgMatch?.[1] || null

  // vídeo: prefere o clipe "oficial" (fora da seção videoLesson)
  const allIds = youtubeIdsFrom(html)
  let youtubeId = null
  if (allIds.length) {
    const lessonPos = html.indexOf('videoLesson')
    const isLesson = (id) => {
      if (lessonPos === -1) return false
      const pos = html.indexOf(id, lessonPos)
      return pos !== -1 && pos - lessonPos < 1200
    }
    youtubeId = allIds.find((id) => !isLesson(id)) || allIds[0]
  }

  const chordRootRe = /^[A-Ga-g][#b]?/
  let toneRootName = toneRoot || null
  for (let k = lines.length - 1; k >= 0; k--) {
    const l = lines[k]
    let name = null
    if (l.kind === 'verse' && l.chordAt.length) {
      const top = l.chordAt[l.chordAt.length - 1]
      name = top.names[top.names.length - 1]
    } else if (l.kind === 'chords' && l.chords.length) {
      name = l.chords[l.chords.length - 1]
    }
    if (name) {
      toneRootName = (name.match(chordRootRe) || [null])[0]
      break
    }
  }

  return {
    artist: artist || slugArtist,
    title: title || slugTitle,
    slug_artist: slugArtist,
    slug_title: slugTitle,
    version,
    cifraclub_url: url,
    youtube_url: youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : null,
    image_url: imageUrl,
    tuning,
    tone_root: toneRootName,
    content: JSON.stringify(lines)
  }
}

// Procura no HTML da página do artista o slug da música que mais combina com o
// título digitado. Retorna o slug cru encontrado (ex.: "me-ama-") ou null.
function matchSongSlug(html, artistSlug, titleTokens) {
  const words = (titleTokens || []).map((w) => w.toLowerCase())
  const core = words.filter((w) => !STOP.has(w))
  if (!core.length) return null
  const coreJoinSlug = core.map(slugify).filter(Boolean).join('-')
  if (!coreJoinSlug || coreJoinSlug.length < 2) return null
  const coreSlugSet = new Set(core.map(slugify).filter(Boolean))

  const re = new RegExp(`href="/${escReg(artistSlug)}/([a-z0-9-]+)/`, 'g')
  let m
  let best = null
  let bestScore = -1
  while ((m = re.exec(html))) {
    const raw = m[1]
    if (!raw || raw.includes('.') || raw.length < 2) continue
    const slug = raw.replace(/-+$/, '')
    let score = -1
    if (slug === coreJoinSlug) {
      score = 100
    } else if (slug.startsWith(coreJoinSlug + '-')) {
      score = 85
    } else {
      const st = slug.split('-').filter(Boolean)
      let overlap = 0
      for (const tok of st) if (coreSlugSet.has(tok)) overlap++
      const ratio = overlap / core.length
      if (ratio >= 0.6) {
        score = 50 + Math.round(ratio * 30) - Math.round(Math.abs(slug.length - coreJoinSlug.length) / 8)
      }
    }
    if (score > bestScore) {
      bestScore = score
      best = raw
    }
  }
  return best
}

function notFoundError() {
  const err = new Error(
    'Não encontramos essa música no Cifra Club. Confira o nome do artista e da música — ex.: "diante do trono me ama".'
  )
  err.status = 404
  return err
}

function cleanTrackName(name) {
  return String(name || '')
    .replace(/\s*\((?:live|ao vivo|acoustic|ac[uú]stico|remix|radio edit|oficial)[^)]*\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

async function searchItunesHits(q) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=10&country=BR`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return []
  const data = await res.json().catch(() => ({}))
  const out = []
  const seen = new Set()
  for (const r of data.results || []) {
    const artist = String(r.artistName || '').split(',')[0].trim()
    const title = cleanTrackName(r.trackName)
    if (!artist || !title) continue
    const key = `${artist.toLowerCase()}|${title.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      artist,
      title,
      image_url: r.artworkUrl100 ? String(r.artworkUrl100).replace('100x100', '200x200') : null
    })
  }
  return out
}

async function searchHits(client, q) {
  const query = String(q || '').trim()
  if (query.length < 2) {
    const err = new Error('Digite pelo menos 2 letras para buscar.')
    err.status = 400
    throw err
  }

  const esc = query.replace(/[\\%_]/g, (c) => `\\${c}`)
  const { data: local } = await client
    .from('songs')
    .select('id, artist, title, slug_artist, slug_title, youtube_url, image_url, tone_root, version')
    .eq('version', 'original')
    .or(`artist.ilike.%${esc}%,title.ilike.%${esc}%`)
    .order('created_at', { ascending: false })
    .limit(10)

  const merged = []
  const seen = new Set()
  for (const row of local || []) {
    const key = `${String(row.artist).toLowerCase()}|${String(row.title).toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(row)
  }

  try {
    for (const hit of await searchItunesHits(query)) {
      const key = `${hit.artist.toLowerCase()}|${hit.title.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(hit)
      if (merged.length >= 10) break
    }
  } catch {
    // iTunes indisponível: devolve só o catálogo
  }

  return { hits: merged.slice(0, 10), source: merged.length ? 'search' : 'empty' }
}

function blockedError() {
  const err = new Error('O Cifra Club bloqueou a busca por enquanto. Tente de novo em alguns instantes.')
  err.status = 429
  return err
}

// Busca em texto livre: testa as combinações possíveis de artista (1–3 palavras
// no começo ou no fim) contra as páginas reais do Cifra Club até achar a cifra.
async function discoverSong(client, q) {
  const tokens = tokenize(q)
  if (tokens.length < 2) {
    const err = new Error('Inclua o artista na busca — ex.: "diante do trono me ama".')
    err.status = 404
    throw err
  }

  // Palpites de artista: do começo para o fim e do fim para o começo.
  const maxK = Math.min(3, tokens.length - 1)
  const guesses = []
  const seen = new Set()
  const consider = (artistTokens, titleTokens) => {
    const lead = artistTokens[0]
    if (!lead || STOP.has(lead)) return
    const slug = slugify(artistTokens.join(' '))
    if (!slug || seen.has(slug)) return
    seen.add(slug)
    guesses.push({ artistSlug: slug, titleTokens })
  }
  for (let k = 1; k <= maxK; k++) consider(tokens.slice(0, k), tokens.slice(k))
  for (let k = 1; k <= maxK; k++) consider(tokens.slice(tokens.length - k), tokens.slice(0, tokens.length - k))

  let homeFetches = 0
  let listFetches = 0

  for (const guess of guesses) {
    const guessTitleSlug = slugify(guess.titleTokens.join(' '))
    const coreSlug = guess.titleTokens
      .filter((w) => !STOP.has(w))
      .map(slugify)
      .filter(Boolean)
      .join('-')

    // Caminho rápido: música já está no catálogo?
    if (guessTitleSlug) {
      const { data: exact } = await client
        .from('songs')
        .select('*')
        .eq('slug_artist', guess.artistSlug)
        .eq('slug_title', guessTitleSlug)
        .eq('version', 'original')
        .maybeSingle()
      if (exact) return { source: 'cache', song: decodeRow(exact) }
    }
    if (coreSlug && coreSlug !== guessTitleSlug) {
      const { data: prefixRows } = await client
        .from('songs')
        .select('*')
        .eq('slug_artist', guess.artistSlug)
        .eq('version', 'original')
        .like('slug_title', `${coreSlug}%`)
        .limit(5)
      const prefixed = (prefixRows || []).find(
        (r) => r.slug_title === coreSlug || r.slug_title.startsWith(`${coreSlug}-`) || r.slug_title.startsWith(`${coreSlug} `)
      )
      if (prefixed) return { source: 'cache', song: decodeRow(prefixed) }
    }

    if (homeFetches >= 6) break
    homeFetches++

    const page = await fetchCc(`${guess.artistSlug}/`)
    if (!page.ok) {
      if (page.status === 429 || page.status === 403 || (page.status >= 500 && page.status <= 599)) {
        throw blockedError()
      }
      continue
    }
    const realArtistSlug = firstSegFromUrl(page.finalUrl) || guess.artistSlug

    let songSlug = matchSongSlug(page.html, realArtistSlug, guess.titleTokens)
    if (!songSlug && listFetches < 2) {
      listFetches++
      const all = await fetchCc(`${realArtistSlug}/musicas.html`)
      if (all.ok) songSlug = matchSongSlug(all.html, realArtistSlug, guess.titleTokens)
    }
    if (songSlug) {
      const scraped = await scrapeSong({ slugArtist: realArtistSlug, slugTitle: songSlug, version: 'original' })
      const row = await upsertSong(client, scraped)
      return { source: 'scraped', song: decodeRow(row) }
    }
  }

  throw notFoundError()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: { message: 'Use POST.' } }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const body = await req.json().catch(() => ({}))
    const q = String(body.q || '').trim()
    const artist = String(body.artist || '').trim()
    const title = String(body.title || '').trim()
    const version = ['original', 'simplificada'].includes(body.version) ? body.version : 'original'

    if (!serviceKey) {
      return new Response(
        JSON.stringify({
          error: {
            message: 'Edge Function sem SERVICE_ROLE_KEY. Defina o secret no Supabase (veja o README).'
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const admin = createClient(supabaseUrl, serviceKey)

    // Modo busca: devolve até 10 cifras próximas (catálogo + Cifra Club)
    if (q) {
      const result = await searchHits(admin, q)
      return new Response(
        JSON.stringify({ mode: 'search', source: result.source, hits: result.hits }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!artist || !title) {
      return new Response(JSON.stringify({ error: { message: 'Informe artista e música.' } }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const slugArtist = asSlug(artist)
    const slugTitle = asSlug(title)

    // 1. já temos no catálogo? (tenta variantes: me-ama e me-ama-)
    let cached = null
    for (const a of slugArtistVariants(slugArtist)) {
      for (const t of slugTitleVariants(slugTitle)) {
        const { data } = await admin
          .from('songs')
          .select('*')
          .eq('slug_artist', a)
          .eq('slug_title', t)
          .eq('version', version)
          .maybeSingle()
        if (data) {
          cached = data
          break
        }
      }
      if (cached) break
    }
    if (cached) {
      return new Response(
        JSON.stringify({ source: 'cache', song: { ...cached, content: JSON.parse(cached.content) } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. não: raspa, salva e devolve
    const scraped = await scrapeSong({ slugArtist, slugTitle, version })
    const song = await upsertSong(admin, scraped)
    return new Response(
      JSON.stringify({ source: 'scraped', song: { ...song, content: JSON.parse(song.content) } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: { message: err.message || 'Erro inesperado.' } }), {
      status: err.status || 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
