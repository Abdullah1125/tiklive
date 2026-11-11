import {onAir} from './wedding.js';
// Draw at the game's native pixel resolution and let the browser scale the frame.
const TAU = Math.PI * 2
const SHOW_CARS = ['#19d7ce', '#f5ab38', '#f05461']
const COSTUMES = ['#ee6857', '#428fa3', '#e6b145', '#9079b3', '#6dbaaa']
const round = Math.round

function box(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill
  ctx.fillRect(round(x), round(y), round(w), round(h))
}

function poly(ctx, points, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(round(points[0][0]), round(points[0][1]))
  for (let i = 1; i < points.length; i++) ctx.lineTo(round(points[i][0]), round(points[i][1]))
  ctx.closePath()
  ctx.fill()
}

function line(ctx, x, y, x2, y2, color, weight = 1) {
  ctx.strokeStyle = color
  ctx.lineWidth = weight
  ctx.beginPath()
  ctx.moveTo(round(x) + 0.5, round(y) + 0.5)
  ctx.lineTo(round(x2) + 0.5, round(y2) + 0.5)
  ctx.stroke()
}

function gradient(ctx, y0, y1, stops) {
  const fill = ctx.createLinearGradient(0, y0, 0, y1)
  for (const [at, color] of stops) fill.addColorStop(at, color)
  return fill
}

function randomGenerator(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

function mountain(ctx, width, horizon, peaks, base, facet, glow) {
  const points = peaks.map(([x, y]) => [x * width, horizon - y])
  poly(ctx, [[0, horizon + 3], ...points, [width, horizon + 3]], base)
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i]
    if (y >= points[i - 1][1] || y >= points[i + 1][1]) continue
    const [nx, ny] = points[i + 1]
    const dx = nx - x
    poly(ctx, [[x, y], [nx, ny], [nx + dx * .4, horizon + 2], [x + dx * .4, y + (ny - y) * .69], [x + dx * .52, y + (ny - y) * .73]], facet)
    line(ctx, x, y, x + dx * .26, y + (ny - y) * .26, glow)
  }
}

function palm(ctx, x, y, size, lean, dark, light) {
  ctx.save()
  ctx.translate(round(x), round(y))
  ctx.scale(size, size)
  const crownX = 3 * lean
  const crownY = -27
  poly(ctx, [[-2, 0], [2, 0], [1 + crownX, -27], [crownX - 1, -27], [-1, -10]], dark)
  for (let n = 4; n < 24; n += 4) box(ctx, -1 + crownX * n / 27, -n, 2, 1, light)
  for (const dir of [-1, 1]) {
    for (const [reach, rise, droop] of [[16, -5, 5], [12, -10, -2], [9, -4, 10], [5, -12, -5]]) {
      const root = crownX
      const far = root + reach * dir
      poly(ctx, [[root, crownY], [root + dir * reach * .36, crownY + rise], [root + dir * reach * .7, crownY + rise + 1], [far, crownY + droop], [root + dir * reach * .67, crownY + rise + 3]], dark)
      line(ctx, root, crownY, root + dir * reach * .42, crownY + rise + 1, light)
      for (let j = 1; j < 4; j++) {
        const t = j / 5
        const tx = root + dir * reach * t
        const ty = crownY + Math.sin(t * Math.PI) * rise + droop * t * t
        line(ctx, tx, ty, tx + dir * 1.7, ty + 3, dark)
      }
    }
  }
  ctx.restore()
}

function rallyBackdrop(ctx, w, h) {
  const horizon = round(h * .55)
  const rand = randomGenerator(1985)
  box(ctx, 0, 0, w, h, gradient(ctx, 0, horizon, [[0, '#685495'], [.34, '#bd7baa'], [.68, '#f09ba3'], [1, '#ffd191']]))
  for (let i = 0; i < 75; i++) {
    const y = rand() * horizon * .8
    box(ctx, rand() * w, y, rand() * 1.6 + 1, 1, 'rgba(255,220,207,.48)')
  }
  // A banded setting sun and thin wind-swept clouds above the water.
  const radius = Math.min(h * .224, w * .217)
  const sx = w * .686
  const sy = horizon - radius * .79
  const glow = ctx.createRadialGradient(sx, sy, radius * .3, sx, sy, radius * 1.55)
  glow.addColorStop(0, 'rgba(255,189,116,.56)')
  glow.addColorStop(1, 'rgba(255,164,116,0)')
  box(ctx, sx - radius * 1.55, sy - radius * 1.55, radius * 3.1, radius * 3.1, glow)
  const solar = gradient(ctx, sy - radius, sy + radius, [[0, '#ffe3a1'], [.48, '#ffc67c'], [1, '#fb776e']])
  for (let yy = -Math.floor(radius); yy < radius; yy++) {
    if ((yy > radius * .15 && (yy + round(radius)) % 7 === 0) || (yy > radius * .54 && (yy + round(radius)) % 7 === 1)) continue
    const half = Math.sqrt(radius * radius - yy * yy)
    box(ctx, sx - half, sy + yy, 2 * half, 1, solar)
  }
  for (let i = 0; i < 10; i++) {
    const x = rand() * w
    const y = (rand() * .77 + .11) * horizon
    const len = (rand() * .11 + .05) * w
    box(ctx, x, y, len, 1, 'rgba(255,210,178,.62)')
    box(ctx, x - len * .22, y + 2, len * .82, 1, 'rgba(247,188,173,.75)')
    box(ctx, x + len * .32, y - 1, len * .52, 1, 'rgba(255,209,181,.65)')
  }

  const unit = h / 235
  const far = [[0,18],[.04,28],[.075,22],[.13,38],[.175,20],[.22,29],[.28,14],[.33,21],[.39,14],[.48,25],[.52,21],[.56,29],[.61,13],[.65,17],[.73,5],[.8,14],[.86,30],[.89,26],[.935,42],[1,23]]
  const near = [[0,30],[.045,31],[.09,23],[.15,18],[.18,20],[.25,8],[.31,13],[.39,4],[.45,7],[.48,2],[.62,0],[.73,3],[.78,9],[.82,8],[.87,18],[.90,15],[.95,31],[1,40]]
  const scaled = peaks => peaks.map(([x, y]) => [x, y * unit])
  mountain(ctx, w, horizon, scaled(far), '#a17eac', '#8d77a6', '#d29ab2')
  mountain(ctx, w, horizon + 2, scaled(near), '#68628e', '#555582', '#a4849f')
  box(ctx, 0, horizon + 2, w, h - horizon, gradient(ctx, horizon, h, [[0, '#9d8aa0'], [.185, '#df9d9c'], [.42, '#92768a'], [1, '#5d5480']]))
  box(ctx, 0, horizon + 1, w, 2, '#d4a5a1')
  for (let i = 0; i < 290; i++) {
    const d = rand()
    const y = horizon + 3 + d * h * .44
    const x = rand() * w
    const shine = Math.abs(x - sx) < w * (.055 + d * .08)
    box(ctx, x, y, (1 + rand() * (shine ? 13 : 6)) * (.55 + d), 1, shine ? '#f7ba97' : 'rgba(194,163,169,.70)')
  }

  // Tapered rocky headlands leave the bay visible on either side of the road.
  poly(ctx, [[0,horizon-3*unit],[w*.07,horizon-1],[w*.13,horizon+5*unit],[w*.23,horizon+7*unit],[w*.34,horizon+14*unit],[w*.25,horizon+16*unit],[0,horizon+9*unit]], '#5e5b7a')
  poly(ctx, [[0,horizon+6*unit],[w*.15,horizon+10*unit],[w*.22,horizon+15*unit],[w*.27,horizon+16*unit],[w*.23,horizon+18*unit],[0,horizon+13*unit]], '#83768d')
  poly(ctx, [[w,horizon-5*unit],[w*.95,horizon-2*unit],[w*.9,horizon-1],[w*.82,horizon+6*unit],[w*.78,horizon+7*unit],[w*.85,horizon+9*unit],[w,horizon+7*unit]], '#625d80')
  for (let i = 0; i < 11; i++) palm(ctx, rand() * w * .165, horizon + unit * 3, (.12 + rand() * .15) * unit, rand() > .5 ? 1 : -1, '#585274', '#79637f')
  for (let i = 0; i < 6; i++) palm(ctx, (.91 + rand() * .09) * w, horizon + 1, (.12 + rand() * .18) * unit, 1, '#5b5473', '#75627a')
}

function roadPoint(w, h, t) {
  const curve = .53 - .125 * Math.sin(t * Math.PI * 1.75) * Math.sin(Math.PI * t) + .025 * t
  return { x: w * curve, y: h * (.552 + .448 * t), half: w * (.005 + .55 * t ** 1.24) }
}

function rallyRoad(ctx, w, h, time) {
  const slices = 54
  let before = roadPoint(w, h, 0)
  const elapsed = time * .00011
  const asphalt = gradient(ctx, h * .55, h, [[0, '#786a80'], [.45, '#4e4e66'], [1, '#33384f']])
  for (let i = 1; i <= slices; i++) {
    const t = i / slices
    const p = roadPoint(w, h, t)
    const phase = Math.floor(1 / (.035 + t * .62) - elapsed * 2.4)
    const stripe = phase % 2 === 0
    const edge = (a, b, fill) => poly(ctx, [
      [before.x + before.half * a, before.y - .4], [before.x + before.half * b, before.y - .4],
      [p.x + p.half * b, p.y + .5], [p.x + p.half * a, p.y + .5]
    ], fill)
    edge(-1.29, 1.29, '#67627b')
    edge(-1.18, 1.18, '#c7938e')
    edge(-1.07, 1.07, stripe ? '#f4b893' : '#ad5c71')
    edge(-1, 1, asphalt)
    edge(-.97, -.95, '#f2c0a0')
    edge(.95, .97, '#f2c0a0')
    if (stripe && t > .07) {
      edge(-.337, -.324, '#d9bca6')
      edge(.324, .337, '#d9bca6')
    }
    before = p
  }
  const unit = h / 235
  // Depth-sorted palms stand on both sides of the causeway.
  for (const [t, side, offset] of [[.1,-1,1.18],[.15,1,1.35],[.22,-1,1.5],[.29,1,1.35],[.37,-1,1.39],[.42,1,1.44],[.57,-1,1.38],[.63,1,1.42],[.86,-1,1.16],[.96,1,1.11]]) {
    const p = roadPoint(w, h, t)
    palm(ctx, p.x + side * p.half * offset, p.y, (.07 + t * 2.18) * Math.min(unit, w / 290), side === 1 ? -1 : 1, '#393751', '#6a546b')
  }
  for (const t of [.2, .235, .28, .34, .44, .59, .83]) {
    const a = roadPoint(w, h, t)
    for (const side of [-1, 1]) {
      const x = a.x + side * a.half * 1.11
      box(ctx, x, a.y - t * unit * 7, Math.max(1, t * unit * 2.7), t * unit * 8, '#51475f')
      box(ctx, x, a.y - t * unit * 7, Math.max(1, t * unit * 2.7), Math.max(1, t * unit * 3), '#f2b79b')
    }
  }
}

// Rear sprite coordinates are in half-car pixels. Mirroring the body keeps each
// fender, louvre and wheel aligned as the sprite grows towards the foreground.
function car(ctx, x, y, scale, color, boost) {
  ctx.save()
  ctx.translate(round(x), round(y))
  ctx.scale(scale, scale)
  ctx.fillStyle = 'rgba(39,31,54,.52)'
  ctx.beginPath()
  ctx.ellipse(0, -1, 21, 4, 0, 0, TAU)
  ctx.fill()
  if (boost) {
    for (const k of [-11, 11]) {
      poly(ctx, [[k-2,-1],[k+2,-1],[k+1,5],[k,9],[k-2,5]], '#ff935e')
      box(ctx,k-1,0,2,4,'#ffed9f')
    }
  }
  box(ctx,-18,-9,6,10,'#222336')
  box(ctx,12,-9,6,10,'#222336')
  poly(ctx,[[-19,-5],[-19,-11],[-16,-14],[-12,-15],[-9,-21],[-6,-23],[7,-23],[10,-21],[13,-15],[17,-13],[19,-10],[19,-5],[15,-3],[-15,-3]],'#32273f')
  poly(ctx,[[-18,-6],[-18,-11],[-14,-14],[-11,-14],[-8,-20],[-5,-22],[7,-22],[10,-20],[13,-14],[16,-13],[18,-10],[18,-6],[14,-4],[-14,-4]], color)
  poly(ctx,[[-10,-15],[-7,-20],[7,-20],[10,-15]],'#344360')
  poly(ctx,[[-8,-16],[-6,-19],[2,-19],[0,-16]],'#82a1b8')
  poly(ctx,[[2,-16],[5,-19],[7,-19],[9,-16]],'#5f819d')
  box(ctx,-5,-22,11,1,'#ffd8b8')
  box(ctx,-2,-22,2,1,'#fff0ca')
  box(ctx,-2,-15,2,4,'#f8d39e')
  box(ctx,1,-15,1,4,'#f8d39e')
  box(ctx,-16,-14,5,1,'#f7bdab')
  box(ctx,11,-14,5,1,'#f7bdab')
  // Uprights, dark spoiler, edge glints and separate rectangular tail lights.
  box(ctx,-13,-13,2,3,'#503d55')
  box(ctx,11,-13,2,3,'#503d55')
  box(ctx,-19,-14,38,2,'#3b354b')
  box(ctx,-19,-14,38,1,'#b88f9c')
  box(ctx,-17,-10,34,4,'#572f49')
  for (const k of [-16,8]) {
    box(ctx,k,-10,8,3,'#ff655b')
    box(ctx,k+1,-10,6,1,'#ffbe91')
    box(ctx,k+4,-10,1,3,'#944d60')
  }
  box(ctx,-3,-9,6,3,'#ffe3ad')
  box(ctx,-2,-8,3,1,'#62536b')
  box(ctx,-17,-5,34,2,'#303347')
  box(ctx,-13,-3,4,1,'#c5a1a3')
  box(ctx,9,-3,4,1,'#c5a1a3')
  ctx.restore()
}

function namePlate(ctx, name, x, y, accent, maxWidth) {
  ctx.font = 'bold 8px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const chars = Array.from(String(name || 'İzleyici'))
  if (chars.length > 17) chars.splice(16, chars.length, '…')
  let label = chars.join('')
  while (ctx.measureText(label).width > maxWidth - 8 && chars.length > 1) {
    chars.pop()
    label = chars.join('') + '…'
  }
  const width = Math.ceil(ctx.measureText(label).width) + 9
  x = Math.max(width / 2, Math.min(ctx.canvas.width - width / 2, x))
  box(ctx,x-width/2,y-6,width,12,'rgba(28,26,44,.88)')
  box(ctx,x-width/2,y-6,2,12,accent)
  ctx.fillStyle = '#fff2de'
  ctx.fillText(label, round(x + 1), round(y+.5))
}

function rally(ctx, w, h, state, time, activeEffect) {
  rallyRoad(ctx, w, h, time)
  const field = state.players
  const unit = Math.min(h / 230, w / 285)
  const cars = field.map((player,index) => {
    // Advancing cars move closer to the finish on the horizon.
    const lanes = field.length > 9 ? [-.23,.23,-.72,.72] : [0,-.63,.63]
    const lane = lanes[index % lanes.length]
    const row = Math.floor(index / lanes.length)
    const t = Math.max(.13, .905 - Math.min(99,player.score || 0) * .0058 - row * .07)
    const p = roadPoint(w,h,t)
    const wobble = Math.sin(time * .001 + index * 3) * unit * t
    const x = p.x + p.half * lane + wobble
    const y = p.y + Math.sin(time * .01 + index) * unit * .37
    const scale = (.19 + t ** 1.6 * 2.09) * unit
    return { player, x, y, scale }
  }).sort((a,b) => a.y - b.y)
  for (const {player,x,y,scale} of cars) {
    const boost = activeEffect && state.effect.playerId === player.id && ['like','gift','win'].includes(state.effect.type)
    car(ctx,x,y,scale,player.color || SHOW_CARS[2],boost)
    namePlate(ctx,player.name,x,y-scale*25-5,player.color || '#efbf7f',Math.min(w*.32,92))
  }
}

function building(ctx, x, ground, w, height, wall, roof, rand) {
  const y = ground - height
  box(ctx,x,y,w,height,wall)
  poly(ctx,[[x-2,y],[x+w*.35,y-5],[x+w*.76,y-5],[x+w+3,y+1]],roof)
  box(ctx,x-1,y+1,w+2,2,roof)
  for (let floor=y+5;floor<ground-4;floor+=10) {
    for (let column=x+3;column<x+w-3;column+=7) {
      box(ctx,column,floor,4,6,'#322c4a')
      box(ctx,column+1,floor+1,2,4,rand()>.38?'#ffba74':'#765d77')
      box(ctx,column-1,floor+6,6,1,roof)
    }
  }
}

function festivalBackdrop(ctx, w, h) {
  const rand = randomGenerator(418)
  const floor = round(h*.65)
  const unit = Math.min(w/320,h/230)
  box(ctx,0,0,w,h,gradient(ctx,0,floor,[[0,'#242645'],[.4,'#65416d'],[.77,'#cf777d'],[1,'#ebaa85']]))
  for (let i=0;i<100;i++) {
    const x=rand()*w, y=rand()*floor
    box(ctx,x,y,1,1,'rgba(255,222,183,.76)')
    if (i%21===0) box(ctx,x-1,y+1,3,1,'rgba(255,218,180,.45)')
  }
  ctx.fillStyle='#ffe0a4'
  ctx.beginPath()
  ctx.arc(w*.7,h*.23,Math.max(6,10*unit),0,TAU)
  ctx.fill()
  const peaks=[[0,12],[.07,18],[.17,14],[.28,25],[.32,22],[.37,30],[.42,21],[.5,25],[.64,10],[.7,13],[.82,23],[.89,20],[1,35]]
  mountain(ctx,w,floor-h*.09,peaks.map(([x,y])=>[x,y*unit]),'#766180','#675775','#ae8094')
  // Distant dome and stone minarets on the skyline.
  const ground=floor-h*.065
  const mx=round(w*.58)
  ctx.fillStyle='#574662'
  ctx.beginPath()
  ctx.arc(mx,ground-7*unit,12*unit,Math.PI,TAU)
  ctx.fill()
  box(ctx,mx-17*unit,ground-7*unit,34*unit,11*unit,'#574662')
  box(ctx,mx,ground-23*unit,1,6*unit,'#574662')
  for (const dir of [-1,1]) {
    const x = mx+dir*22*unit
    box(ctx,x,ground-29*unit,3*unit,30*unit,'#564560')
    box(ctx,x-unit,ground-24*unit,5*unit,2*unit,'#574662')
    poly(ctx,[[x,ground-29*unit],[x+unit*1.5,ground-39*unit],[x+unit*3,ground-29*unit]],'#4e415a')
  }
  let x=-6
  while (x < w) {
    const bw = Math.max(12,(13+rand()*14)*unit)
    building(ctx,x,floor-6*unit,bw,(8+rand()*9)*unit,'#765774','#62465e',rand)
    x+=bw
  }
  box(ctx,0,floor-4,w,h-floor+4,gradient(ctx,floor,h,[[0,'#ab777a'],[.48,'#9b6c72'],[1,'#614d66']]))
  // Converging joints in the town square's limestone paving.
  for(let i=-8;i<=8;i++) line(ctx,w*.5+i*w*.033,floor,w*.5+i*w*.23,h,'#855d6c')
  for(const t of [.02,.075,.16,.27,.42,.59,.79,.99]){
    const y=floor+t*(h-floor)
    box(ctx,0,y,w,1,'#805967')
    box(ctx,0,y+1,w,1,'rgba(235,157,142,.25)')
  }
  building(ctx,-3,floor+h*.03,w*.133,h*.35,'#966970','#664459',rand)
  building(ctx,w*.13,floor,w*.065,h*.17,'#b98176','#7b525f',rand)
  building(ctx,w*.88,floor+h*.01,w*.14,h*.29,'#a27473','#6b4c60',rand)
  for(const [px,py] of [[.02,.09],[.98,.13]]) {
    const sx=w*px
    box(ctx,sx,py*h,2*unit,(.67-py)*h,'#624754')
  }
  // Two strings of lanterns sag across the square, layered against the sunset.
  for (const [start,end,dip,count] of [[.12,.17,.1,19],[.23,.21,.105,14]]) {
    let previous
    for (let i=0;i<=count;i++) {
      const t=i/count
      const sx=t*w
      const sy=(start*(1-t)+end*t+4*t*(1-t)*dip)*h
      if(previous) line(ctx,previous[0],previous[1],sx,sy,'#54435e')
      if(i>0 && i<count){
        box(ctx,sx,sy,1,4,'#785267')
        if(i%3===0) {
          const color=i%2?'#feb16a':'#f38672'
          box(ctx,sx-2*unit,sy+3,4*unit,5*unit,color)
          box(ctx,sx-unit,sy+2,2*unit,1,'#ffd191')
          box(ctx,sx,sy+4,unit,3*unit,'#ffd994')
          box(ctx,sx-unit,sy+3+5*unit,2*unit,1,'#864d59')
        } else box(ctx,sx,sy+3,Math.max(1,unit*2),2,'#ffdc97')
      }
      previous=[sx,sy]
    }
  }
}

function dancer(ctx,x,y,size,color,index,time,leader,gender) {
  const beat=time*.004
  const up=Math.max(0, Math.sin(beat))*1.8
  const step=Math.sin(beat)*2
  const skin=['#e3ac83','#cf9673','#b87859','#efbd94'][index%4]
  ctx.save()
  ctx.translate(round(x),round(y))
  ctx.scale(size,size)
  ctx.fillStyle='rgba(76,47,63,.5)'
  ctx.beginPath()
  ctx.ellipse(0,1,6.7,2.1,0,0,TAU)
  ctx.fill()
  ctx.translate(0,-round(up))
  const hair=['#473345','#352e41','#624349'][index%3]
  box(ctx,-4,-6+step,3,5,'#443649')
  box(ctx,-5,-2+step,4,2,'#312c42')
  box(ctx,1,-6-step,3,5,'#473648')
  box(ctx,1,-2-step,5,2,'#302c42')
  poly(ctx,[[-3,-15],[3,-15],[4,-12],[5,-6],[2,-4],[-3,-5],[-5,-6]],color)
  box(ctx,-3,-10,7,2,'#f4cc82')
  box(ctx,-1,-15,2,5,'#f9dfad')
  box(ctx,-1,-16,3,2,skin)
  box(ctx,-3,-22,6,6,skin)
  box(ctx,-3,-23,6,2,hair)
  box(ctx,-4,-22,2,4,hair)
  box(ctx,2,-20,1,1,'#4e3947')
  if(gender ? gender==='female' : index%2===0){
    box(ctx,-4,-23,7,1,color)
    box(ctx,-2,-24,4,1,'#ffc588')
    box(ctx,-4,-18,2,5,hair)
    poly(ctx,[[-3,-10],[3,-10],[6,-5],[-6,-5]],color)
  } else {
    box(ctx,-3,-24,6,2,'#8d5755')
    box(ctx,-4,-23,8,1,'#493749')
  }
  const arm=-14+Math.sin(beat)*2
  for(const dir of [-1,1]){
    line(ctx,dir*3,-14,dir*6,arm+2,color,2.3)
    line(ctx,dir*6,arm+2,dir*8,arm,skin,2)
  }
  if(leader) poly(ctx,[[-8,arm],[-12,arm-4],[-15,arm-2+step],[-13,arm+2],[-10,arm+1]],'#ffebe0')
  ctx.restore()
}

function festival(ctx,w,h,state,time,shot,speaker) {
  const people=[...state.players,...Object.values(state.roles || {})]
  const leaderIndex=people.findIndex(player=>player.id===state.leader)
  if(leaderIndex>0) people.unshift(people.splice(leaderIndex,1)[0])
  const capacity = Math.max(5, Math.floor(w / 34))
  const rows=Math.ceil(people.length/capacity)
  const size=Math.min(h*.0063,w/160,2.5, (h*.36/rows)/29)
  const pin=shot?.tier==='gold';
  const receiver=shot?.playerId===state.roles?.bride?.id?state.roles?.groom:state.roles?.bride;
  let from=[w*.35,h*.72],to=[w*.53,h*.68];
  let chatAnchor;
  for(let i=0;i<people.length;i++){
    const row=Math.floor(i/capacity)
    const count=Math.min(capacity, people.length-row*capacity)
    const col=i%capacity
    const x=w*.5+(col-(count-1)/2)*Math.min(size*16.5,w*.86/count)
    const y=h*(rows===1?.82:.65+.28*(row+1)/rows)+Math.cos((col-(count-1)/2)/count*Math.PI)*size*3
    const player=people[i]
    if(pin && player.id===shot.playerId)from=[x+size*7,y-size*13];
    if(pin && player.id===receiver?.id)to=[x+size,y-size*14];
    const lead=player.id===state.leader
    const role=Object.keys(state.roles || {}).find(key=>state.roles[key].id===player.id)
    const gender=role ? (role==='bride'?'female':'male') : player.gender
    dancer(ctx,x,y,size,player.color || COSTUMES[i%COSTUMES.length],i,time,lead,gender)
    if(player.name) namePlate(ctx,player.name,x,y-size*27-6,player.color || '#ffa07b',Math.min(85,w*.29))
    if(player.id===speaker)chatAnchor={x:x/w,y:(y-size*27-14)/h}
  }
  if(pin){
    const t=Math.max(0,Math.min(1,(Date.now()-shot.at-450)/1450)),r=Math.max(4,size*3);
    const x=from[0]+(to[0]-from[0])*t,y=from[1]+(to[1]-from[1])*t-Math.sin(Math.PI*t)*h*.16;
    poly(ctx,[[x-r,y-r*2.2],[x+r,y-r*2.2],[x,y]],'#bb1b39');
    ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle='#ffd057';ctx.fill();ctx.strokeStyle='#a56d20';ctx.stroke();
  }
  return chatAnchor
}

function celebration(ctx,w,h,effect) {
  if (!effect || !['gift','win'].includes(effect.type)) return
  const elapsed=Date.now()-effect.at
  if(elapsed<0 || elapsed>2200) return
  const t=elapsed/2200
  const rand=randomGenerator(Math.floor(effect.at)%4294967296)
  for(let i=0;i<42;i++){
    const x=(rand()*w+Math.sin(i+t*8)*w*.04)
    const y=(rand()*h*.6-h*.6)+t*h*1.58
    box(ctx,x,y,1+Math.abs(Math.sin(i+t*10))*3,2+i%3,['#ffe487','#ff837c','#a7e5d1','#ffd0e5'][i%4])
  }
}

export function mountScene(canvas) {
  const ctx=canvas.getContext('2d', {alpha:false})
  const backdrop=document.createElement('canvas')
  const bg=backdrop.getContext('2d',{alpha:false})
  let state={game:'rally',players:[],likes:0,gifts:0,round:1,effect:null,leader:null}
  let renderedGame
  let disposed=false
  let frame=0
  let last=0
  let gameTime=0
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)')
  let chat
  canvas.style.imageRendering='pixelated'
  function draw(now) {
    if(disposed || !canvas.isConnected) return
    frame=requestAnimationFrame(draw)
    if(now-last<1000/30) return
    const elapsed=Math.min(100,now-last)
    last=now
    const cw=canvas.clientWidth, ch=canvas.clientHeight
    if(!cw || !ch) return
    const scale=Math.min(600/cw, 480/ch, 1)
    const w=Math.max(1,round(cw*scale)), h=Math.max(1,round(ch*scale))
    if(canvas.width!==w || canvas.height!==h || renderedGame!==state.game) {
      canvas.width=backdrop.width=w
      canvas.height=backdrop.height=h
      if(state.game==='halay') festivalBackdrop(bg,w,h)
      else rallyBackdrop(bg,w,h)
      renderedGame=state.game
    }
    const shot=state.game==='halay'?onAir(state):null
    const effect=state.game==='halay'?(shot && ['money','confetti'].includes(shot.tier)?{type:'gift',at:shot.at}:null):state.effect
    const activeEffect=effect && Date.now()-effect.at<1600
    const tempo=state.game==='halay' ? 1+Math.min(1.5,state.likes/120) : 1
    gameTime+=elapsed*tempo
    const time=reduced.matches?250:gameTime
    ctx.drawImage(backdrop,0,0)
    if(state.game==='halay') chat.place(festival(ctx,w,h,state,time,shot,chat.tick(Date.now())))
    else rally(ctx,w,h,state,time,activeEffect)
    if(!reduced.matches) celebration(ctx,w,h,effect)
  }
  frame=requestAnimationFrame(draw)
  return {
    update(next) {
      state={...state,...next}
      if(state.game==='halay'){
        chat??=mountWeddingChat(canvas.parentElement)
        chat.update(state.chatMessages)
      }
    },
    destroy() { disposed=true; cancelAnimationFrame(frame);chat?.destroy() }
  }
}

// The scene supplies a fresh projected head position on each frame. One
// speaker at a time keeps gifts, names and the dance floor legible.
export function mountWeddingChat(host) {
  const bubble=document.createElement('div');
  const name=document.createElement('strong'),text=document.createElement('span');
  bubble.className='wedding-chat-bubble floating';
  bubble.hidden=true;
  name.dir=text.dir='auto';
  bubble.append(name,text);
  host.append(bubble);

  const maxAge=20000;
  const seen=new Map();
  let queue=[],active,until=0;
  function update(messages=[]) {
    const now=Date.now();
    for(const [id,at] of seen)if(now-at>maxAge)seen.delete(id);
    for(const message of messages){
      if(now-message.at>maxAge || !message.text || seen.has(message.id))continue;
      seen.set(message.id,message.at);
      if(active?.playerId===message.playerId){
        if(active.text===message.text)continue;
        active=message;text.textContent=message.text;
        until=now+5000;continue;
      }
      queue=queue.filter(item=>item.playerId!==message.playerId && now-item.at<maxAge);
      queue.push(message);
      if(queue.length>6)queue.shift();
    }
  }
  function tick(now) {
    if(active && now<until)return active.playerId;
    active=undefined;
    while(queue.length && !active){
      const message=queue.shift();
      if(now-message.at<maxAge)active=message;
    }
    if(!active){
      if(!bubble.hidden)bubble.hidden=true;
      return;
    }
    name.textContent=active.username?'@'+active.username.replace(/^@/,''):active.name;
    text.textContent=active.text;
    bubble.hidden=false;
    until=now+Math.min(6500,4000+Array.from(active.text).length*30);
    return active.playerId;
  }
  function place(point){
    if(!active)return;
    // Keep the bubble away from the upper guide and the bottom TikTok chat.
    const visible=point && point.x>=.04 && point.x<=.96 && point.y>=.22 && point.y<=.89 &&
      !(point.x<.27 && point.y<.36);
    bubble.classList.toggle('anchored',!!visible);
    bubble.classList.toggle('floating',!visible);
    bubble.style.left=visible?Math.max(24,Math.min(76,point.x*100))+'%':'';
    bubble.style.top=visible?point.y*100+'%':'';
  }
  return {update,tick,place,destroy:()=>bubble.remove()};
}
