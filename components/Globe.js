import { WebView } from 'react-native-webview';
import { View, StyleSheet } from 'react-native';

export default function Globe({ cities = [] }) {

  const citiesJSON = JSON.stringify(cities.map(c => ({
    name: c.city,
    lat: c.lat,
    lon: c.lon,
  })));

  const HTML = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0d0d1a; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
  canvas { display: block; }
</style>
</head>
<body>
<canvas id="globe"></canvas>
<script src="https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js"></script>
<script>
var cities = ${citiesJSON};

var canvas = document.getElementById('globe');
var ctx = canvas.getContext('2d');
var SIZE = Math.min(window.innerWidth, window.innerHeight) * 0.92;
canvas.width = SIZE;
canvas.height = SIZE;
var cx = SIZE / 2, cy = SIZE / 2, R = SIZE * 0.44;
var rot = 0;
var lands = [];

function proj(lat, lon) {
  var phi = lat * Math.PI / 180;
  var lam = (lon + rot) * Math.PI / 180;
  return {
    x: cx + R * Math.cos(phi) * Math.sin(lam),
    y: cy - R * Math.sin(phi),
    z: Math.cos(phi) * Math.cos(lam)
  };
}

function drawRing(coords) {
  if (!coords || coords.length < 2) return;
  var first = true, pv = false;
  ctx.beginPath();
  for (var i = 0; i < coords.length; i++) {
    var lo = coords[i][0], la = coords[i][1];
    var p = proj(la, lo);
    var vis = p.z > -0.05;
    if (vis) {
      if (first || !pv) { ctx.moveTo(p.x, p.y); } else { ctx.lineTo(p.x, p.y); }
      first = false;
    }
    pv = vis;
  }
  ctx.closePath();
}

function draw() {
  ctx.clearRect(0, 0, SIZE, SIZE);

  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = '#0d1a2e';
  ctx.fill();
  ctx.strokeStyle = '#1a2a4a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#1e3a5a';
  ctx.strokeStyle = '#2a4a6a';
  ctx.lineWidth = 0.6;
  for (var f = 0; f < lands.length; f++) {
    var g = lands[f].geometry;
    if (!g) continue;
    var polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    for (var p = 0; p < polys.length; p++) {
      for (var r = 0; r < polys[p].length; r++) {
        drawRing(polys[p][r]);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  for (var i = 0; i < cities.length; i++) {
    var c = cities[i];
    var pt = proj(c.lat, c.lon);
    if (pt.z > 0.05) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, SIZE * 0.013, 0, Math.PI * 2);
      ctx.fillStyle = '#7F77DD';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.font = (SIZE * 0.032) + 'px sans-serif';
      ctx.fillStyle = '#AFA9EC';
      ctx.fillText(c.name, pt.x + SIZE * 0.022, pt.y + SIZE * 0.012);
    }
  }

  rot += 0.08;
  requestAnimationFrame(draw);
}

fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
  .then(function(r) { return r.json(); })
  .then(function(world) {
    lands = topojson.feature(world, world.objects.countries).features;
    draw();
  })
  .catch(function() {
    draw();
  });
</script>
</body>
</html>
`;

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: HTML }}
        style={styles.webview}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        mixedContentMode="always"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#0d0d1a' },
});