"""Gera escalas de cor de 12 passos em OKLCH (estilo Radix) e verifica o contraste WCAG."""
import json
import math
import sys


def s2l(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def l2s(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055


def h2rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def rgb2h(rgb):
    return '#' + ''.join(f'{round(max(0, min(1, c)) * 255):02X}' for c in rgb)


def cbrt(x):
    return math.copysign(abs(x) ** (1 / 3), x)


def rgb2oklch(rgb):
    r, g, b = [s2l(c) for c in rgb]
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l_, m_, s_ = cbrt(l), cbrt(m), cbrt(s)
    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    return L, math.hypot(A, B), math.degrees(math.atan2(B, A)) % 360


def oklch2lin(L, C, H):
    a = C * math.cos(math.radians(H))
    b = C * math.sin(math.radians(H))
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    return (4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)


def ingamut(lin):
    return all(-1e-7 <= x <= 1 + 1e-7 for x in lin)


def oklch2hex(L, C, H):
    """Converte para hex; se a cor sair do gamut sRGB, reduz o croma até caber."""
    if not ingamut(oklch2lin(L, C, H)):
        lo, hi = 0.0, C
        for _ in range(40):
            mid = (lo + hi) / 2
            if ingamut(oklch2lin(L, mid, H)):
                lo = mid
            else:
                hi = mid
        C = lo
    return rgb2h(tuple(l2s(min(1, max(0, x))) for x in oklch2lin(L, C, H)))


def lum(h):
    r, g, b = [s2l(c) for c in h2rgb(h)]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def cr(a, b):
    x, y = lum(a), lum(b)
    return (max(x, y) + 0.05) / (min(x, y) + 0.05)


# Luminosidade (L de OKLCH) e fator de croma de cada passo, modo claro e escuro.
# Passos: 1-2 fundos · 3-5 componentes · 6-8 bordas · 9-10 sólidos · 11-12 texto
L_LIGHT = [0.993, 0.979, 0.954, 0.927, 0.897, 0.860, 0.808, 0.735, None, None, 0.470, 0.275]
C_LIGHT = [0.07, 0.12, 0.22, 0.32, 0.42, 0.50, 0.60, 0.75, 1, 1, 0.95, 0.55]
L_DARK = [0.170, 0.200, 0.238, 0.270, 0.303, 0.343, 0.398, 0.478, None, None, 0.815, 0.940]
C_DARK = [0.10, 0.14, 0.20, 0.27, 0.34, 0.41, 0.50, 0.64, 1, 1, 0.80, 0.32]


def scale(base_hex, dark9):
    L9, C9, H = rgb2oklch(h2rgb(base_hex))
    out = {'light': [], 'dark': []}
    for i in range(12):
        if i == 8:
            out['light'].append(base_hex.upper())
        elif i == 9:
            out['light'].append(oklch2hex(L9 - 0.045, C9, H))
        else:
            out['light'].append(oklch2hex(L_LIGHT[i], C9 * C_LIGHT[i], H))
    Ld9, Cd9, _ = rgb2oklch(h2rgb(dark9))
    for i in range(12):
        if i == 8:
            out['dark'].append(dark9.upper())
        elif i == 9:
            # hover mais escuro também no modo escuro, para o texto branco manter o contraste
            out['dark'].append(oklch2hex(Ld9 - 0.035, Cd9, H))
        else:
            out['dark'].append(oklch2hex(L_DARK[i], C9 * C_DARK[i], H))
    return out, (round(L9, 3), round(C9, 3), round(H, 1))


def neutral(hue):
    Ll = [0.995, 0.982, 0.958, 0.934, 0.908, 0.878, 0.834, 0.762, 0.640, 0.600, 0.505, 0.240]
    Cl = [0.002, 0.003, 0.005, 0.006, 0.007, 0.008, 0.010, 0.012, 0.013, 0.013, 0.014, 0.016]
    Ld = [0.168, 0.198, 0.232, 0.262, 0.292, 0.328, 0.383, 0.458, 0.570, 0.610, 0.790, 0.950]
    Cd = [0.006, 0.007, 0.008, 0.009, 0.010, 0.011, 0.012, 0.013, 0.014, 0.014, 0.012, 0.006]
    return {'light': [oklch2hex(L, C, hue) for L, C in zip(Ll, Cl)],
            'dark': [oklch2hex(L, C, hue) for L, C in zip(Ld, Cd)]}


def brightest_ok(base):
    """No modo escuro, o passo 9 é a versão mais clara que ainda dá >= 4,6:1 com texto branco."""
    L, C, H = rgb2oklch(h2rgb(base))
    best = base
    for k in range(40):
        cand = oklch2hex(L + k * 0.005, C, H)
        if cr('#FFFFFF', cand) >= 4.6:
            best = cand
        else:
            break
    return best


GREEN, ORANGE, AMBER, RED, BLUE = '#1F7A3D', '#C2410C', '#A16207', '#C42B2B', '#1E5BB8'
g, gi = scale(GREEN, brightest_ok(GREEN))
o, oi = scale(ORANGE, brightest_ok(ORANGE))
n = neutral(gi[2])
amber, _ = scale(AMBER, brightest_ok(AMBER))
red, _ = scale(RED, brightest_ok(RED))
blue, _ = scale(BLUE, brightest_ok(BLUE))
scales = {'verde': g, 'laranja': o, 'neutro': n, 'ambar': amber, 'vermelho': red, 'azul': blue}

print('Verde base OKLCH (L, C, h):', gi, '| Laranja base:', oi)
for name, s in scales.items():
    for mode in ('light', 'dark'):
        print(f'{name:9s} {mode:5s} ' + ' '.join(s[mode]))


def check(mode):
    N, G, O, A, R, B = n[mode], g[mode], o[mode], amber[mode], red[mode], blue[mode]
    W = '#FFFFFF'
    rows = [
        ('texto principal (neutro 12) / fundo (neutro 1)', N[11], N[0], 7),
        ('texto secundário (neutro 11) / fundo (neutro 1)', N[10], N[0], 4.5),
        ('texto secundário (neutro 11) / mosaico (neutro 2)', N[10], N[1], 4.5),
        ('texto secundário (neutro 11) / preenchimento (neutro 3)', N[10], N[2], 4.5),
        ('branco / verde 9 (botão principal)', W, G[8], 4.5),
        ('branco / verde 10 (hover)', W, G[9], 4.5),
        ('branco / laranja 9 (em direto)', W, O[8], 4.5),
        ('branco / laranja 10 (hover)', W, O[9], 4.5),
        ('verde 11 / verde 3 (etiqueta)', G[10], G[2], 4.5),
        ('verde 11 / fundo (link)', G[10], N[0], 4.5),
        ('laranja 11 / laranja 3 (etiqueta direto)', O[10], O[2], 4.5),
        ('âmbar 11 / âmbar 3 (pendente)', A[10], A[2], 4.5),
        ('vermelho 11 / vermelho 3 (erro)', R[10], R[2], 4.5),
        ('azul 11 / azul 3 (confirmada)', B[10], B[2], 4.5),
        ('branco / vermelho 9 (botão de erro)', W, R[8], 4.5),
        ('verde 9 / fundo (contorno de componente)', G[8], N[0], 3),
        ('contorno de campo (neutro 9) / fundo', N[8], N[0], 3),
        ('contorno de campo (neutro 9) / mosaico (neutro 2)', N[8], N[1], 3),
    ]
    print(f'\n== contraste {mode} ==')
    ok = True
    for label, a, b, minimo in rows:
        v = cr(a, b)
        flag = 'OK   ' if v >= minimo else 'FALHA'
        ok = ok and v >= minimo
        print(f'  {flag} {v:5.2f}:1 (mín {minimo}) {label}')
    return ok


okl = check('light')
okd = check('dark')
with open(sys.argv[1], 'w', encoding='utf-8') as f:
    json.dump(scales, f, indent=1)
print('\nTUDO OK' if okl and okd else '\nHÁ FALHAS')
