// The video-file player page the mobile app loads in its WebView (VOA Learning English lessons).
// Same contract as /embed/youtube: no controls (videos are mandatory, no skipping ahead), a global
// `player` with the YouTube-like methods, and a message to the app every second. Only https mp4 files
// on the allowed hosts (shared/content/videos.ts) are played.
import { isNativeVideoUrl } from "@shared/content/videos";

function int(v: string | null): number | null {
  if (v === null || !/^\d{1,6}$/.test(v)) return null;
  return Number(v);
}

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const url = params.get("u") ?? "";
  if (!isNativeVideoUrl(url)) return new Response("bad video url", { status: 400 });
  const start = int(params.get("start")) ?? 0;
  const end = int(params.get("end"));

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>video</title>
<style>html,body{margin:0;background:#000;height:100%;overflow:hidden}video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}</style></head>
<body><video id="v" playsinline preload="metadata"></video><script>
var v=document.getElementById('v'),START=${start},END=${end ?? 0};
function send(m){try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(m))}catch(e){}}
function st(){return v.ended?0:(v.paused?2:1)}
var player={
  getCurrentTime:function(){return v.currentTime},
  getDuration:function(){return isFinite(v.duration)?v.duration:0},
  getPlayerState:st,
  pauseVideo:function(){v.pause()},
  playVideo:function(){var p=v.play();if(p&&p.catch)p.catch(function(){send({type:'state',state:2})})},
  seekTo:function(t){v.currentTime=t},
  setPlaybackRate:function(r){v.playbackRate=r}
};
v.addEventListener('loadedmetadata',function(){if(START>0)v.currentTime=START;send({type:'ready',duration:player.getDuration()})});
v.addEventListener('play',function(){send({type:'state',state:1})});
v.addEventListener('pause',function(){if(!v.ended)send({type:'state',state:2})});
v.addEventListener('ended',function(){send({type:'state',state:0})});
v.addEventListener('error',function(){send({type:'error',code:v.error&&v.error.code})});
v.addEventListener('timeupdate',function(){if(END&&v.currentTime>=END&&!v.paused){v.pause();send({type:'state',state:0})}});
v.src=${JSON.stringify(url)};
setInterval(function(){send({type:'tick',t:v.currentTime,state:st(),duration:player.getDuration()})},1000);
</script></body></html>`;

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
