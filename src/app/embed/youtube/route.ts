// The YouTube player page the mobile app loads in its WebView. Served from our own https origin so
// YouTube sees a normal web page (real origin and referrer) instead of an inline page inside an app,
// which it may answer with "Sign in to confirm you're not a bot". No seek bar (videos are mandatory);
// it reports the time every second to the app through window.ReactNativeWebView.postMessage.

const ID = /^[A-Za-z0-9_-]{11}$/;

function int(v: string | null): number | null {
  if (v === null || !/^\d{1,6}$/.test(v)) return null;
  return Number(v);
}

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("v") ?? "";
  if (!ID.test(id)) return new Response("bad video id", { status: 400 });
  const start = int(params.get("start")) ?? 0;
  const end = int(params.get("end"));
  const vars = JSON.stringify({ controls: 0, disablekb: 1, playsinline: 1, rel: 0, fs: 0, iv_load_policy: 3, start, ...(end ? { end } : {}) });

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin"><title>video</title>
<style>html,body{margin:0;background:#000;height:100%;overflow:hidden}#p{position:absolute;inset:0;width:100%;height:100%}</style></head>
<body><div id="p"></div><script>
var player;
function send(m){try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(m))}catch(e){}}
function onYouTubeIframeAPIReady(){
  var vars=${vars};vars.origin=location.origin;vars.widget_referrer=location.href;
  player=new YT.Player('p',{videoId:'${id}',host:'https://www.youtube.com',playerVars:vars,events:{
    onReady:function(){send({type:'ready',duration:player.getDuration()})},
    onStateChange:function(e){send({type:'state',state:e.data})},
    onError:function(e){send({type:'error',code:e.data})}}});
  setInterval(function(){if(player&&player.getCurrentTime){send({type:'tick',t:player.getCurrentTime(),state:player.getPlayerState(),duration:player.getDuration()})}},1000);
}
</script><script src="https://www.youtube.com/iframe_api"></script></body></html>`;

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
