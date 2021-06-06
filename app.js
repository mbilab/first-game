import Phaser from 'phaser'
import axios from 'axios'
import Swal from 'sweetalert2'
import Mustache from 'mustache'


const urlParams = new URLSearchParams(window.location.search)

const config = {
  server: urlParams.get('server')
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'phaser',
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 300 },
      debug: false
    }
  },
  scene: { create, preload, update },
  gameOver: false,
})

function clearAllTimeouts() {
  let id = window.setTimeout(null,0)
  while (id--)
    window.clearTimeout(id)
}

function counter(skill, cd, count){
  var portion = cd / 1000
  if (document.getElementById(skill))
    document.getElementById(skill).style.height = `${100 / count * portion}%`
  if(cd<=0){
    this[skill] = true
  }
  else{
    setTimeout(()=>{counter.call(this, skill, cd, count)}, 1000);
  }
  cd-=1000
}

function getName() {
  return
  Swal.fire({
    title: 'What\'s your name',
    icon: 'question',
    input: 'text',
    inputPlaceholder: 'Anonymous',
    confirmButtonText: 'Start'
  }).then( message => {
    this.playerName = message.value ? message.value : 'Anonymous'
  })
}

function renderLeaderboard(record) {
  let template = '\
              {{#record}}\
              <tr>\
                <td class="center aligned">{{rank}}</td>\
                <td>{{name}}</td>\
                <td>{{score}}</td>\
              </tr>\
              {{/record}}\
  '
  let rendered = Mustache.render(template, record)
  document.getElementById('target').innerHTML = rendered
}

// arrow function is not allowed, because of `this` binding
function preload() {
  // Step 1.1 code goes here
  this.load.setBaseURL('https://labs.phaser.io')
  this.load.image('sky', 'src/games/firstgame/assets/sky.png')
  this.load.image('ground', 'src/games/firstgame/assets/platform.png')
  this.load.image('star', 'src/games/firstgame/assets/star.png')
  this.load.image('bomb', 'src/games/firstgame/assets/bomb.png')
  this.load.spritesheet('dude',
    'src/games/firstgame/assets/dude.png',
    { frameWidth: 32, frameHeight: 48 }
  )
  // Step 8.1 code goes here
  this.load.audioSprite('sfx', 'assets/audio/SoundEffects/fx_mixdown.json');
}

function create() {
  if (!window.playerName)
    getName()

  axios.get(`${config.server}/record`)
  .then(response => {
    this.record = response.data.record
    world_score = this.add.text(450, 16, `World Reocrd: ${this.record[0].score}`, { fontSize: '32px', fill: '#000' })
    renderLeaderboard(response.data)
  })
  .catch((err) => {
    console.log('錯誤:', err)
  })
  // Step 1.2 code goes here
  this.add.image(400, 300, 'sky')
  // Step 2 code goes here
  var platforms = this.physics.add.staticGroup()
  platforms.create(400, 568, 'ground').setScale(2).refreshBody()
  platforms.create(600, 400, 'ground').setScale(1, .5).refreshBody()
  platforms.create( 50, 250, 'ground').setScale(1, .5).refreshBody()
  platforms.create(750, 220, 'ground').setScale(1, .5).refreshBody()
  // Step 3 code goes here
  this.player = this.physics.add.sprite(100, 450, 'dude')
  // player.setBounce(.2)
  this.player.setCollideWorldBounds(true)
  // Step 4.1 code goes here
  this.anims.create({ frameRate: 10, frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }), key: 'left', repeat: -1 })
  this.anims.create({ frameRate: 20, frames: [ { key: 'dude', frame: 4 } ], key: 'turn', })
  this.anims.create({ frameRate: 10, frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }), key: 'right', repeat: -1 })

  this.cursors = this.input.keyboard.createCursorKeys()
  // Step 4.3 code goes here
  this.physics.add.collider(this.player, platforms)
  // Step 5.1 code goes here
  this.stars = this.physics.add.group({ key: 'star', repeat: 11, setXY: { x: 12, y: 0, stepX: 70 } })
  this.stars.children.iterate(star => star.setBounceY(Phaser.Math.FloatBetween(0.2, 0.3)))
  this.physics.add.collider(this.stars, platforms)
  // Step 5.2 code goes here
  this.physics.add.overlap(this.player, this.stars, collectStar, null, this)
  // Step 6.1 code goes here
  this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#000' })
  // Step 7.1 code goes here
  this.bombs = this.physics.add.group()
  this.physics.add.collider(this.bombs, platforms)
  this.bombCollider = this.physics.add.collider(this.player, this.bombs, hitBomb, null, this)
  this.score = 0
  this.accelerate = 0
  this.blink = true
  this.cd = true
  this.invisible = true
  this.fall = true
  this.nJump = 0
  this.zawarudo = true
  // this.dio = false
  this.blinkKey = this.input.keyboard.addKey('v')
  this.boostKey = this.input.keyboard.addKey('z')
  this.invisibleKey = this.input.keyboard.addKey('x')
  this.zawarudoKey = this.input.keyboard.addKey('c')
  // this.sound.play('bgm', { volume: 0.3, loop: true})
}

function update() {
  // Step 4.2 code goes here
  const speed = 160
  if (this.cursors.left.isDown) {
    this.player.setVelocityX(-speed - this.accelerate*50)
    this.player.anims.play('left', true)
  } else if (this.cursors.right.isDown) {
    this.player.setVelocityX(speed + this.accelerate*50)
    this.player.anims.play('right', true)
  } else{
    this.player.setVelocityX(0)
    this.player.anims.play('turn')
  }

  if (this.cursors.up.isDown && this.player.body.touching.down) {
    this.player.setVelocityY(-330)
  }

  // boost event
  if (this.boostKey.isDown && (this.accelerate == 0) && this.cd) {
    this.accelerate = 10
    this.cd = false
  }

  if (this.boostKey.isUp)
    this.cd = true

  if (this.accelerate > 20)
    this.accelerate = 0
  else if (this.accelerate != 0)
    this.accelerate -= 1

  // blink event
  if (this.blink && this.blinkKey.isDown) {
    this.blink = false
    this.accelerate = 200
    let cd = 2000
    let count = cd / 1000
    counter.call(this, 'blink', cd, count)
  }

  // invisible event
  if (this.invisibleKey.isDown && this.invisible) {
    this.invisible = false
    this.player.alpha = 0.5
    this.bombCollider.active = false
    let cd = 10000
    let count = cd / 1000
    document.getElementById('invisible').style.height = `${cd/100}%`
    window.setTimeout(()=>{
      this.player.alpha = 1
      this.bombCollider.active = true
    }, 3000)
  }

  // zarwarudo event
  if (this.zawarudo && this.zawarudoKey.isDown) {
    this.zawarudo = false
    // this.sound.play('zawarudo')
    this.bombs.children.iterate( bomb => {
      bomb.body.enable = false
    } )
    // this.dio = true
    document.getElementsByTagName('canvas')[0].style.filter = 'invert(1)'
    let cd = 15000
    let count = cd / 1000
    counter.call(this, 'zawarudo', cd, count)
    window.setTimeout(()=>{
      this.bombs.children.iterate( bomb => bomb.body.enable = true )
      document.getElementsByTagName('canvas')[0].style.filter = 'invert(0)'
    }, 2000)
  }

  // double jump event
  if (this.player.body.touching.down)
    this.nJump = 0

  if (!this.player.body.touching.down && (this.nJump == 0))
    this.nJump = 1

  if (this.cursors.up.isUp && (this.nJump == 1))
    this.nJump = 2

  if (this.cursors.up.isDown && (this.nJump == 2)) {
    this.player.setVelocityY(-290)
    this.nJump = 3
  }

  // hero landing event
  if (this.cursors.down.isDown && !this.player.body.touching.down && this.fall) {
    this.fall = false
    this.player.setVelocityY(800)
    let cd = 2000
    let count = cd / 1000
    document.getElementById('fall').style.height = `${100 / count * (cd / 1000)}%`
    counter.call(this, 'fall', cd, count)
  }

  // gameover check
  if (this.gameOver && this.cursors.space.isDown){
    // this.registry.destroy()
    clearAllTimeouts()
    document.querySelectorAll('.cd').forEach(el => el.style.height = '0%')
    this.scene.restart()
    this.gameOver = false
    renderLeaderboard({record: this.record})
  }

  // if (this.dio) {
  //   document.getElementById('dio').style.animationName = 'zawarudo'
  //   this.dio = false
  // }

}

function collectStar(player, star) {
  star.disableBody(true, true)

  // Step 6.2 code goes here
  this.score += 10
  this.scoreText.setText('Score: ' + this.score)
  // Step 7.2 code goes here
  if (0 == this.stars.countActive(true)) {
    this.invisible = true
    document.getElementById('invisible').style.height = '0%'
    this.stars.children.iterate(star => star.enableBody(true, star.x, 0, true, true))
    let x = player.x < 400 ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400)
    let bomb = this.bombs.create(x, 16, 'bomb')
    bomb.setBounce(1)
    bomb.setCollideWorldBounds(true)
    bomb.setVelocity(Phaser.Math.Between(-200, 200), 20)
  }
  // Step 8.2 code goes here
  this.sound.playAudioSprite('sfx', 'ping', {volume: 0.3})
}

function hitBomb(player, bomb) {
  this.gameOver = true

  // Step 7.3 code goes here
  this.physics.pause()
  player.anims.play('turn')
  player.setTint(0xff0000)
  // Step 8.3 code goes here
  this.sound.playAudioSprite('sfx', 'death')

  var obj = {
    rank: 99,
    name: window.playerName,
    score: this.score
  }
  this.record.push(obj)
  this.record = this.record.sort(function(a, b){
    return a.score > b.score ? -1: 1;
  })
  rank = 1
  for (i=0; i < this.record.length; i++) {
    this.record[i].rank = i + 1
  }

  axios.post(`${config.server}/new_record`, this.record.slice(0, 8))
}
