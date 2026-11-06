<?php
$config = require __DIR__ . '/admin_config.php';
session_name($config['session_name'] ?? 'penales_admin_session');
session_start();

function h($v) { return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); }
function defaultRoster($variant = 'normal') {
    $base = [
        [10,'PATEADOR #10','DEL',91,84,92],
        [9,'PATEADOR #9','DEL',82,93,80],
        [7,'PATEADOR #7','EXT',88,79,86],
        [11,'PATEADOR #11','EXT',85,87,78],
        [8,'PATEADOR #8','VOL',79,81,90],
        [6,'PATEADOR #6','VOL',83,80,84],
        [5,'PATEADOR #5','DEF',76,86,82],
        [4,'PATEADOR #4','DEF',78,83,85],
        [3,'PATEADOR #3','DEF',74,88,77],
        [2,'PATEADOR #2','DEF',77,82,81],
        [1,'ARQUERO #1','ARQ',69,85,88]
    ];
    if ($variant === 'rival') {
        $base = [
            [10,'PATEADOR #10','DEL',84,86,83],[9,'PATEADOR #9','DEL',80,91,79],[7,'PATEADOR #7','EXT',87,78,86],
            [11,'PATEADOR #11','EXT',82,84,81],[8,'PATEADOR #8','VOL',78,80,88],[6,'PATEADOR #6','VOL',81,82,80],
            [5,'PATEADOR #5','DEF',75,87,81],[4,'PATEADOR #4','DEF',76,84,82],[3,'PATEADOR #3','DEF',73,88,77],
            [2,'PATEADOR #2','DEF',77,81,79],[1,'ARQUERO #1','ARQ',67,84,86]
        ];
    }
    return array_map(function($p){
        return [
            'number'=>$p[0], 'name'=>$p[1], 'position'=>$p[2],
            'keeper'=>$p[0]===1, 'precision'=>$p[3], 'power'=>$p[4], 'composure'=>$p[5]
        ];
    }, $base);
}

$defaults = [
    'local' => ['displayName'=>'CURICÓ UNIDO','roster'=>defaultRoster('normal')],
    'rival' => ['displayName'=>'AMARGOS FC','roster'=>defaultRoster('rival')],
    'copa' => [
        ['name'=>'DEPORTES MAULE','roster'=>defaultRoster('rival')],
        ['name'=>'ATLÉTICO TALCA','roster'=>defaultRoster('rival')],
        ['name'=>'AMARGOS FC','roster'=>defaultRoster('rival')]
    ]
];

$dataFile = __DIR__ . '/admin_teams.json';
$data = $defaults;
if (is_file($dataFile)) {
    $loaded = json_decode(file_get_contents($dataFile), true);
    if (is_array($loaded)) $data = array_replace_recursive($defaults, $loaded);
}

if (isset($_GET['logout'])) {
    $_SESSION = [];
    session_destroy();
    header('Location: admin.php');
    exit;
}

$error = '';
$notice = '';
if (empty($_SESSION['admin_ok'])) {
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login_password'])) {
        if (password_verify((string)$_POST['login_password'], $config['password_hash'])) {
            session_regenerate_id(true);
            $_SESSION['admin_ok'] = true;
            $_SESSION['csrf'] = bin2hex(random_bytes(24));
            header('Location: admin.php');
            exit;
        }
        $error = 'Clave incorrecta.';
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['save'])) {
    if (!hash_equals($_SESSION['csrf'] ?? '', $_POST['csrf'] ?? '')) {
        $error = 'Sesión inválida. Recarga la página.';
    } else {
        $posted = $_POST['team'] ?? [];
        $keys = ['local','rival','copa0','copa1','copa2'];
        $new = $data;
        foreach ($keys as $key) {
            if (!isset($posted[$key])) continue;
            $src = $posted[$key];
            $isCup = strpos($key, 'copa') === 0;
            $idx = $isCup ? intval(substr($key, 4)) : null;
            $baseRoster = $isCup ? $data['copa'][$idx]['roster'] : $data[$key]['roster'];
            $teamName = trim((string)($src['team_name'] ?? ''));
            if ($teamName === '') $teamName = $isCup ? $data['copa'][$idx]['name'] : $data[$key]['displayName'];
            $roster = [];
            for ($i=0; $i<11; $i++) {
                $base = $baseRoster[$i] ?? defaultRoster('rival')[$i];
                $name = trim((string)($src['players'][$i]['name'] ?? $base['name']));
                $number = intval($src['players'][$i]['number'] ?? $base['number']);
                if ($number < 1) $number = 1;
                if ($number > 99) $number = 99;
                $base['name'] = $name !== '' ? $name : ('JUGADOR #'.$number);
                $base['number'] = $number;
                $roster[] = $base;
            }
            // Evita dorsales duplicados dentro del mismo equipo.
            $nums = array_column($roster, 'number');
            if (count($nums) !== count(array_unique($nums))) {
                $error = 'No se permiten dorsales repetidos dentro del mismo equipo.';
                break;
            }
            if ($isCup) {
                $new['copa'][$idx]['name'] = $teamName;
                $new['copa'][$idx]['roster'] = $roster;
            } else {
                $new[$key]['displayName'] = $teamName;
                $new[$key]['roster'] = $roster;
            }
        }
        if (!$error) {
            $json = json_encode($new, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
            $js = "window.PENALES_ADMIN_TEAMS = " . json_encode($new, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES) . ";\n";
            if (@file_put_contents($dataFile, $json . "\n", LOCK_EX) === false || @file_put_contents(__DIR__.'/teams_custom.js', $js, LOCK_EX) === false) {
                $error = 'No fue posible guardar. Da permiso de escritura al servidor web sobre admin_teams.json y teams_custom.js.';
            } else {
                $data = $new;
                $notice = 'Cambios guardados correctamente. El juego usará estos nombres y dorsales.';
            }
        }
    }
}

$logged = !empty($_SESSION['admin_ok']);
$teamsForView = [
    'local' => ['label'=>'Local', 'name'=>$data['local']['displayName'], 'roster'=>$data['local']['roster']],
    'rival' => ['label'=>'Rival principal', 'name'=>$data['rival']['displayName'], 'roster'=>$data['rival']['roster']],
    'copa0' => ['label'=>'Copa · Cuartos', 'name'=>$data['copa'][0]['name'], 'roster'=>$data['copa'][0]['roster']],
    'copa1' => ['label'=>'Copa · Semifinal', 'name'=>$data['copa'][1]['name'], 'roster'=>$data['copa'][1]['roster']],
    'copa2' => ['label'=>'Copa · Final', 'name'=>$data['copa'][2]['name'], 'roster'=>$data['copa'][2]['roster']],
];
?><!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Administración · Penales</title>
<style>
:root{color-scheme:dark;--bg:#07111f;--card:#0c1b2c;--line:#253b52;--red:#e4231f;--text:#f5f8fb;--muted:#9fb4c8;--green:#20d985}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#10243a,#040a11 62%);font-family:Arial,sans-serif;color:var(--text)}.wrap{max-width:1180px;margin:0 auto;padding:24px}.top{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-bottom:22px}.brand h1{margin:2px 0;font-size:24px}.brand small{color:var(--muted);letter-spacing:.15em}.logout,.btn{border:1px solid var(--line);border-radius:12px;padding:11px 15px;background:#102338;color:#fff;text-decoration:none;font-weight:700;cursor:pointer}.btn.primary{background:var(--red);border-color:#ff4d48}.login{max-width:420px;margin:12vh auto;background:rgba(12,27,44,.94);border:1px solid var(--line);border-radius:20px;padding:28px}.login input,.teamname,.player input{width:100%;background:#081522;color:#fff;border:1px solid var(--line);border-radius:9px;padding:10px}.login button{width:100%;margin-top:12px}.alert{padding:12px 14px;border-radius:10px;margin:12px 0}.error{background:#4a1717}.ok{background:#123e2a}.tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}.tab{padding:9px 13px;border:1px solid var(--line);background:#0b1928;color:#dfe9f2;border-radius:10px;cursor:pointer}.tab.active{background:#17304a;border-color:#466987}.teamcard{display:none;background:rgba(12,27,44,.94);border:1px solid var(--line);border-radius:18px;padding:20px}.teamcard.active{display:block}.teamhead{display:grid;grid-template-columns:180px 1fr;gap:14px;align-items:center;margin-bottom:16px}.players{display:grid;grid-template-columns:1fr 1fr;gap:10px}.player{display:grid;grid-template-columns:56px 1fr;gap:10px;align-items:center;background:#081522;border:1px solid #1f354a;border-radius:12px;padding:10px}.player .num input{text-align:center;font-size:18px;font-weight:800}.meta{font-size:11px;color:var(--muted);margin-top:5px}.actions{position:sticky;bottom:0;margin-top:18px;padding:14px;background:rgba(4,10,17,.93);border:1px solid var(--line);border-radius:14px;display:flex;justify-content:flex-end;gap:10px}.note{color:var(--muted);font-size:13px;line-height:1.5}@media(max-width:720px){.players{grid-template-columns:1fr}.teamhead{grid-template-columns:1fr}.wrap{padding:14px}.top{align-items:flex-start}.brand h1{font-size:20px}}
</style></head><body>
<?php if (!$logged): ?>
<div class="login"><div style="font-size:34px">🔐</div><h1>Administración del juego</h1><p class="note">Área privada. No existe enlace desde la pantalla pública del juego.</p><?php if($error):?><div class="alert error"><?=h($error)?></div><?php endif;?><form method="post"><label>Clave de administrador</label><input type="password" name="login_password" autocomplete="current-password" required autofocus><button class="btn primary" type="submit">Ingresar</button></form></div>
<?php else: ?>
<div class="wrap"><div class="top"><div class="brand"><small>PENALES · PANEL PRIVADO</small><h1>Administración de equipos y jugadores</h1></div><a class="logout" href="?logout=1">Cerrar sesión</a></div>
<?php if($error):?><div class="alert error"><?=h($error)?></div><?php endif;?><?php if($notice):?><div class="alert ok"><?=h($notice)?></div><?php endif;?>
<p class="note">Edita el nombre del equipo, nombres de jugadores y dorsales. Los atributos de juego se conservan. Los cambios se aplican globalmente porque se guardan en el servidor.</p>
<form method="post"><input type="hidden" name="csrf" value="<?=h($_SESSION['csrf'])?>"><input type="hidden" name="save" value="1">
<div class="tabs"><?php $first=true; foreach($teamsForView as $key=>$tv): ?><button class="tab <?=$first?'active':''?>" type="button" data-tab="<?=h($key)?>"><?=h($tv['label'])?></button><?php $first=false; endforeach;?></div>
<?php $first=true; foreach($teamsForView as $key=>$tv): ?><section class="teamcard <?=$first?'active':''?>" data-card="<?=h($key)?>"><div class="teamhead"><strong><?=h($tv['label'])?></strong><input class="teamname" name="team[<?=h($key)?>][team_name]" value="<?=h($tv['name'])?>" maxlength="40" required></div><div class="players">
<?php foreach($tv['roster'] as $i=>$p): ?><div class="player"><div class="num"><input type="number" min="1" max="99" name="team[<?=h($key)?>][players][<?=$i?>][number]" value="<?=h($p['number'])?>" required></div><div><input type="text" maxlength="40" name="team[<?=h($key)?>][players][<?=$i?>][name]" value="<?=h($p['name'])?>" required><div class="meta"><?=h($p['position'] ?? 'JUG')?><?=!empty($p['keeper'])?' · ARQUERO':''?> · Precisión <?=h($p['precision'])?> · Potencia <?=h($p['power'])?> · Compostura <?=h($p['composure'])?></div></div></div><?php endforeach; ?>
</div></section><?php $first=false; endforeach; ?>
<div class="actions"><button class="btn primary" type="submit">💾 Guardar cambios</button></div></form></div>
<script>document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.teamcard').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelector('[data-card="'+b.dataset.tab+'"]').classList.add('active')}));</script>
<?php endif; ?></body></html>
