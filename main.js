// 初始化Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 游戏对象
const game = {
    player: {
        x: canvas.width / 2,
        y: canvas.height - 100,
        width: 50,
        height: 80,
        speed: 5,
        image: null,
        angle: 0,
        lives: 10
    },
    bullets: [],
    enemyBullets: [],
    enemies: [],
    keys: {},
    lastShot: 0,
    shootDelay: 200,
    level: 1,
    score: 0,
    gameOver: false
};

// 事件监听
document.addEventListener('keydown', (e) => game.keys[e.code] = true);
document.addEventListener('keyup', (e) => game.keys[e.code] = false);
document.addEventListener('mousedown', shoot);
document.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const dx = mouseX - (game.player.x + game.player.width / 2);
    const dy = mouseY - (game.player.y + game.player.height / 2);
    
    game.player.angle = Math.atan2(dy, dx);
});

// 游戏循环
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// 更新游戏状态
function update() {
    // 玩家移动
    if (game.keys['KeyW'] && game.player.y > 0) game.player.y -= game.player.speed;
    if (game.keys['KeyS'] && game.player.y < canvas.height - game.player.height) game.player.y += game.player.speed;
    if (game.keys['KeyA'] && game.player.x > 0) game.player.x -= game.player.speed;
    if (game.keys['KeyD'] && game.player.x < canvas.width - game.player.width) game.player.x += game.player.speed;

    // 更新子弹
    game.bullets.forEach((bullet, index) => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        
        // 检查子弹是否击中敌人
        game.enemies.forEach((enemy, enemyIndex) => {
            if (bullet.x > enemy.x && 
                bullet.x < enemy.x + enemy.width &&
                bullet.y > enemy.y &&
                bullet.y < enemy.y + enemy.height) {
                // 击中敌人
                game.bullets.splice(index, 1);
                if (enemy.type === 'golden') {
                    enemy.hits++;
                    game.score++;
            if (enemy.hits >= 30) {
                enemy.dead = true;
                enemy.deathTime = Date.now();
                game.score += 5;  // 击败金池长老获得更多分数
                
                // 击败一个金池长老就进入下一关
                game.level++;
                game.score = 0;
                spawnEnemies();
            }
                } else {
                    game.enemies.splice(enemyIndex, 1);
                }
            }
        });

        // 检查子弹是否超出屏幕
        if (bullet.x < 0 || bullet.x > canvas.width || 
            bullet.y < 0 || bullet.y > canvas.height) {
            game.bullets.splice(index, 1);
        }
    });

    // 更新敌人子弹
    game.enemyBullets.forEach((bullet, index) => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;

        // 检测是否击中玩家
        if (bullet.x > game.player.x && 
            bullet.x < game.player.x + game.player.width &&
            bullet.y > game.player.y &&
            bullet.y < game.player.y + game.player.height) {
            game.player.lives = Math.max(0, game.player.lives - 1);
            
            // 更新UI
            ctx.fillStyle = '#ffffff';
            ctx.font = '20px Arial';
            ctx.fillText(`生命: ${game.player.lives}`, 20, 90);
            
            // 检查游戏结束
            if (game.player.lives <= 0) {
                game.gameOver = true;
            }
            game.enemyBullets.splice(index, 1);
        }

        // 检测是否出界
        if (bullet.x < 0 || bullet.x > canvas.width || 
            bullet.y < 0 || bullet.y > canvas.height) {
            game.enemyBullets.splice(index, 1);
        }
    });

    // 更新敌人
    game.enemies.forEach((enemy, index) => {
        if (enemy.type === 'normal') {
            enemy.y += enemy.speed;
        } else if (enemy.type === 'golden') {
            // 处理死亡状态
            if (enemy.dead) {
                // 检查是否应该复活
                if (Date.now() - enemy.deathTime > 2000) {
                    enemy.dead = false;
                    enemy.hits = 0;
                }
                return;
            }
            
            // 金池长老AI
            const dx = game.player.x - enemy.x;
            const dy = game.player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 移动
            if (distance > 200) {
                enemy.x += dx / distance * enemy.speed;
                enemy.y += dy / distance * enemy.speed;
            }
            
            // 持续射击（降低射速）
            const now = Date.now();
            if (now - enemy.lastShot > 1000) {  // 1秒射击一次
                const angle = Math.atan2(
                    game.player.y - enemy.y,
                    game.player.x - enemy.x
                );
                
                // 添加子弹
                game.enemyBullets.push({
                    x: enemy.x + enemy.width / 2,
                    y: enemy.y + enemy.height / 2,
                    vx: Math.cos(angle) * 5,
                    vy: Math.sin(angle) * 5,
                    speed: 5,
                    angle: angle,
                    // 添加轨迹效果
                    trail: [],
                    lastTrailUpdate: Date.now()
                });
                enemy.lastShot = now;
            }
        }
        
        // 检查敌人是否到达底部
        if (enemy.y > canvas.height) {
            game.enemies.splice(index, 1);
            game.gameOver = true;
        }
    });
}

// 绘制游戏
function draw() {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制悟空
    ctx.fillStyle = '#ffcc00';
    // 头部
    ctx.beginPath();
    ctx.arc(
        game.player.x + game.player.width / 2,
        game.player.y + 20,
        20,
        0,
        Math.PI * 2
    );
    ctx.fill();
    // 身体
    ctx.fillRect(
        game.player.x + game.player.width / 2 - 15,
        game.player.y + 40,
        30,
        40
    );
    // 手臂
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(
        game.player.x + game.player.width / 2 - 5,
        game.player.y + 50,
        10,
        40
    );

    // 绘制AK-47
    ctx.save();
    ctx.translate(
        game.player.x + game.player.width / 2,
        game.player.y + game.player.height / 2
    );
    ctx.rotate(game.player.angle);
    
    // 枪身
    ctx.fillStyle = '#333333';
    ctx.fillRect(-5, -2, 60, 4);
    // 弹夹
    ctx.fillStyle = '#666666';
    ctx.fillRect(-10, -4, 10, 8);
    // 枪托
    ctx.fillStyle = '#444444';
    ctx.fillRect(-15, -6, 10, 12);
    
    ctx.restore();

    // 绘制UI
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.fillText(`关卡: ${game.level}`, 20, 30);
    ctx.fillText(`分数: ${game.score}`, 20, 60);
    ctx.fillText(`生命: ${game.player.lives}`, 20, 90);

    // 绘制金池长老生命值
    game.enemies.forEach(enemy => {
        if (enemy.type === 'golden') {
            if (!enemy.dead) {
                // 绘制生命条背景
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(enemy.x, enemy.y - 20, enemy.width, 5);
                
                // 绘制当前生命值
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(enemy.x, enemy.y - 20, enemy.width * (1 - enemy.hits / 30), 5);
            }
            
            // 绘制复活倒计时
            if (enemy.dead) {
                const timeLeft = Math.ceil((2000 - (Date.now() - enemy.deathTime)) / 1000);
                ctx.fillStyle = '#ffffff';
                ctx.font = '15px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(
                    `复活: ${timeLeft}s`,
                    enemy.x + enemy.width / 2,
                    enemy.y - 25
                );
            }
        }
    });

    // 游戏结束检测
    if (game.player.lives <= 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ff0000';
        ctx.font = '60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2);
        ctx.font = '30px Arial';
        ctx.fillText(`最终得分: ${game.score}`, canvas.width / 2, canvas.height / 2 + 50);
        return;
    }

    // 绘制子弹
    function drawBullet(bullet, color) {
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        ctx.rotate(bullet.angle);
        
        // 绘制子弹尾焰
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-20, -2);
        ctx.lineTo(-15, -4);
        ctx.lineTo(-15, 4);
        ctx.lineTo(-20, 2);
        ctx.fill();
        
        // 绘制子弹主体
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(-15, -3, 30, 6);
        
        // 绘制弹头
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(15, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制子弹轨迹
        if (bullet.trail) {
            ctx.globalAlpha = 0.3;
            bullet.trail.forEach((point, i) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(point.x, point.y, 2 * (1 - i/bullet.trail.length), 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        }
        
        ctx.restore();
    }

    // 绘制AK-47子弹
    game.bullets.forEach(bullet => {
        drawBullet(bullet, '#ff8800');
    });

    // 绘制敌人子弹
    game.enemyBullets.forEach(bullet => {
        drawBullet(bullet, '#ff0000');
        
        // 更新子弹轨迹
        if (Date.now() - bullet.lastTrailUpdate > 50) {
            bullet.trail.push({x: bullet.x, y: bullet.y});
            if (bullet.trail.length > 10) {
                bullet.trail.shift();
            }
            bullet.lastTrailUpdate = Date.now();
        }
    });

    // 绘制敌人
    drawEnemies();
}

// 射击功能
function shoot() {
    const now = Date.now();
    if (now - game.lastShot < game.shootDelay) return;

    // AK-47射击参数
    const bulletSpeed = 12;
    const bulletAngle = game.player.angle;
    
    const bulletX = Math.cos(bulletAngle) * bulletSpeed;
    const bulletY = Math.sin(bulletAngle) * bulletSpeed;

    game.bullets.push({
        x: game.player.x + game.player.width / 2,
        y: game.player.y + game.player.height / 2,
        vx: bulletX,
        vy: bulletY,
        speed: bulletSpeed,
        angle: bulletAngle
    });

    game.lastShot = now;
}

// 窗口大小调整
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// 生成金池长老
function spawnGoldenEnemy() {
    const goldenEnemy = {
        x: canvas.width * 0.4,
        y: canvas.height * 0.2,
        width: 60,
        height: 80,
        speed: 1 + game.level * 0.1,
        type: 'golden',
        lastShot: Date.now(),
        hits: 0
    };
    game.enemies.push(goldenEnemy);
}

// 生成敌人
function spawnEnemies() {
    const rows = Math.min(game.level, 5);
    const cols = Math.min(game.level, 8);
    const spacing = 80;
    
    // 普通敌人
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            game.enemies.push({
                x: j * spacing + 100,
                y: i * spacing - 200,
                width: 40,
                height: 40,
                speed: 0.5 + game.level * 0.1,
                type: 'normal'
            });
        }
    }
    
    // 根据关卡数生成对应数量的金池长老（每级增加2个）
    for (let i = 0; i < game.level * 2; i++) {
        spawnGoldenEnemy();
    }
    
    // 增加敌人难度
    const baseSpeed = 0.5 + game.level * 0.2;
    const baseHits = 60 + game.level * 10;
}

// 绘制敌人
function drawEnemies() {
    game.enemies.forEach(enemy => {
        if (enemy.type === 'normal') {
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        } else if (enemy.type === 'golden') {
            // 绘制金池长老
            ctx.fillStyle = '#ffcc00';
            // 头部
            ctx.beginPath();
            ctx.arc(
                enemy.x + enemy.width / 2,
                enemy.y + 20,
                20,
                0,
                Math.PI * 2
            );
            ctx.fill();
            // 身体
            ctx.fillRect(
                enemy.x + enemy.width / 2 - 15,
                enemy.y + 40,
                30,
                40
            );
            // 手臂
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(
                enemy.x + enemy.width / 2 - 5,
                enemy.y + 50,
                10,
                40
            );
            // 手枪
            ctx.fillStyle = '#663300';
            ctx.fillRect(
                enemy.x + enemy.width / 2 - 5,
                enemy.y + 60,
                10,
                20
            );
        }
    });
}

// 启动游戏
spawnEnemies();
gameLoop();
