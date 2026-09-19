import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || !query.trim()) {
    return NextResponse.json({ videos: [] });
  }

  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20231201.00.00",
            hl: "en",
            gl: "US",
          },
        },
        query: query.trim(),
      }),
    });

    if (!res.ok) {
      throw new Error(`YouTube responded with ${res.status}`);
    }

    const data = await res.json();
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    const videos: Array<{
      videoId: string;
      title: string;
      author: string;
      lengthText: string;
      viewCountText: string;
      thumbnail: string;
    }> = [];

    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const vr = item?.videoRenderer;
        if (vr && vr.videoId) {
          const title =
            vr.title?.runs?.map((r: { text?: string }) => r.text || "").join("") ||
            vr.title?.simpleText ||
            "";
          const author =
            vr.ownerText?.runs?.map((r: { text?: string }) => r.text || "").join("") ||
            vr.longBylineText?.runs?.map((r: { text?: string }) => r.text || "").join("") ||
            "";
          const lengthText =
            vr.lengthText?.simpleText ||
            vr.lengthText?.runs?.map((r: { text?: string }) => r.text || "").join("") ||
            "";
          const viewCountText =
            vr.viewCountText?.simpleText ||
            vr.viewCountText?.runs?.map((r: { text?: string }) => r.text || "").join("") ||
            "";
          const thumbnails = vr.thumbnail?.thumbnails || [];
          const thumbnail =
            thumbnails[thumbnails.length - 1]?.url ||
            `https://i.ytimg.com/vi/${vr.videoId}/mqdefault.jpg`;

          videos.push({
            videoId: vr.videoId,
            title,
            author,
            lengthText,
            viewCountText,
            thumbnail,
          });
        }
      }
    }

    return NextResponse.json({ videos: videos.slice(0, 24) });
  } catch (err: unknown) {
    console.error("YouTube search error:", err);
    return NextResponse.json(
      { error: "Failed to search YouTube", videos: [] },
      { status: 500 }
    );
  }
}
