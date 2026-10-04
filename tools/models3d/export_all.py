# Все модели — в игру: по сцене на модель → www/models/<сцена>.m3d (по умолчанию — www/models этого репозитория;
# другое место — OUT = r"…" перед этим файлом). Запуск: node bl.mjs common.py export_all.py
# Заменили файлы — увеличить M3D.VER в www/js/m3d.js (у игроков модели лежат в своём кэше до смены метки)
# 5.1.40: обычный Ловчий (catcher) — модель со скелетом из генератора, выгружает skinned.mjs: здесь его нет (иначе затрёт)
# 5.1.41: Источник — колодец владельца со скелетом (spring_anim.py + skinned.mjs): здесь его тоже нет
NAMES = [f'catcher_{s}' for s in ('kupala', 'leshiy', 'moroz', 'volhv', 'bogatyr', 'voron', 'navstrazh', 'zharpero', 'knyaz')] + [f'{k}_{m}' for m in ('slavic', 'greek', 'norse', 'celtic', 'egypt', 'china', 'aztec', 'japan') for k in ('shrine', 'rift')]
OUT = globals().get('OUT') or os.path.normpath(os.path.join(TOOLS, '..', '..', 'www', 'models'))
os.makedirs(OUT, exist_ok=True)
win = bpy.context.window_manager.windows[0]
for nm in NAMES:
    win.scene = bpy.data.scenes[nm]
    export_m3d(os.path.join(OUT, nm + '.m3d'))
