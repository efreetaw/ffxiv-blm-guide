"""Recalculate the guide's 31 rotations using exact rational arithmetic.

Run: python blm/nga-43757414/audit-31-rotations.py
Inputs below are manual transcriptions of the original diagrams, not values
parsed from the annotations. Output: 31个特化循环-数值核查.html.
This is a static potency ledger, not a rotation simulator.
"""
from collections import Counter
from fractions import Fraction as F
from html import escape as esc
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent
GUIDE = "7.2黑魔进阶攻略-原文注释版.html"
POTENCY = {
    "F4": F(300) * F("1.8"), "A": F(540), "U": F(540),
    "B3": F(290), "B3AF1": F(290) * F("0.9"),
    "B3AF3": F(290) * F("0.7"), "B4": F(300),
    "F3": F(290) * F("1.4"), "F3UI1": F(290) * F("0.9"),
    "D": F(350) * F("1.8"), "Fl1": F(240) * F("1.4"),
    "Fl3": F(240) * F("1.8"), "FS": F(500) * F("1.8"),
}


def tally(counts):
    assert all(isinstance(n, int) and n >= 0 for n in counts.values())
    return sum(counts.values()), sum((POTENCY[k] * n for k, n in counts.items()), F(0))


def add(*counts):
    result = Counter()
    for item in counts:
        result.update(item)
    return dict(result)


BASE = dict(B3=1, B4=1, U=1, F3=1, F4=6, A=1, FS=1, D=1)
FIRE = dict(F4=6, A=1, FS=1, D=1)
OPEN = dict(F4=10, A=1, FS=1, D=2)
COMBO = add(BASE, FIRE)
Q = tally(BASE)[1] / tally(BASE)[0]
assert tally(BASE) == (13, 6846)
assert tally(FIRE) == (9, 5310)
assert tally(OPEN) == (14, 8100)
assert tally(COMBO) == (22, 12156)


def fmt(x, places=3):
    if x.denominator == 1:
        return str(x.numerator)
    return f"{float(x):.{places}f}".rstrip("0").rstrip(".")


def pvalue(target, reference, q=Q):
    gt, st = tally(target)
    gr, sr = tally(reference)
    return st - sr - q * (gt - gr)


rows = []


def row(no, section, name, original, target, reference, status="吻合", note="", variants=(), images=()):
    gt, st = tally(target)
    gr, sr = tally(reference)
    value = pvalue(target, reference)
    equation = f"({fmt(st)}−{fmt(sr)})−Q×({gt}−{gr})＝{fmt(value, 6)}"
    details = [equation, "计数：" + "、".join(f"{k}×{n}" for k, n in target.items())]
    for title, alternative, ref in variants:
        details.append(f"{title}：{fmt(pvalue(alternative, ref), 6)}")
    rows.append(dict(no=no, section=section, name=name, original=original,
                     result=fmt(value), status=status, note=note,
                     details=details, images=images))


ice57 = dict(B4=1, U=1, F3=1, F4=12, FS=2, D=1)
ice_d57 = add(ice57, dict(D=1))
left60 = dict(F4=12, A=1, FS=2, B4=1, U=1, F3=1, D=1)
core277 = dict(U=1, F3=1, F4=9, D=1, Fl3=1, FS=2)
ice277 = add(core277, dict(B4=1))
rear3fl = dict(F3=1, F4=3, Fl3=1, FS=1)
fire_no_d = dict(F4=6, A=1, FS=1)

row(1, 24, "2.1 5+7起手", "283.4", dict(F4=12, FS=2, D=1), OPEN,
    note="静态收益吻合；后续缺火苗用A3标改接续。", images=(3, 4))
row(2, 25, "2.2 A3标改", "0", BASE, BASE,
    note="技能数量不变；A在AF1仍为540，之后火3仍为406。", images=(5,))
row(3, 26, "2.3 核爆起手", "175.4", dict(F4=10, Fl3=1, FS=2, A=1, D=1), OPEN,
    note="图6、图8吻合；图7少一发盈余火4，收益为162，不能共用175.4。",
    variants=(("图7：9发火4版本", dict(F4=9, Fl3=1, FS=2, A=1, D=1), OPEN),), images=(6, 7, 8))
row(4, 27, "2.4 截断起手", "79.8", dict(F4=13, D=2, FS=2, A=2, B4=1, F3=1), add(OPEN, BASE),
    status="末位差异", note="完整精度结果四舍五入为79.7。", images=(9,))
row(5, 28, "2.5 冰针5+7", "106.5", ice57, COMBO, images=(10,))
row(6, 29, "2.6 冰针绝望5+7", "209.8", ice_d57, COMBO, images=(11,))
row(7, 30, "2.7 单星灵冰针绝望5+7", "64.8",
    dict(B4=1, U=1, F3UI1=1, F4=12, FS=2, D=2), COMBO,
    note="火3从406降至261，损失145。", images=(12,))
row(8, 63, "2.8 魔泉剩余蓝冰针6+6", "106.5", dict(F4=12, FS=2, B4=1, F3=1, D=1), COMBO,
    status="需补条件", note="当前图13没有U，按图为93.1；加一发U才是106.5。",
    variants=(("补一发U", ice57, COMBO),), images=(13,))
row(9, 31, "2.9 剩余蓝冰针6+0", "119.8", left60, COMBO,
    note="计入前段6发火4；附件06给出完整两段。", images=("extra-06", "extra-19"))
row(10, 32, "2.10 剩余蓝冰针6+0改", "16.4", {k: v for k, v in left60.items() if k != "D"}, COMBO,
    status="末位差异", note="完整精度四舍五入为16.5；用已舍入的119.8−630＋526.6会得16.4。", images=(14, "extra-07"))
row(11, 33, "2.11 2+7+核", "198.3", core277, COMBO, images=(15,))
row(12, 34, "2.12 剩余蓝2+7+核", "94.9", add(fire_no_d, core277), add(FIRE, COMBO),
    note="相对上一条，计入前段少一发绝望：198.307692−630＋Q。", images=(16,))
row(13, 35, "2.13 一档核爆魔泉双耀星", "−1.8", dict(U=1, Fl1=1, F4=6, FS=2, A=1, Fl3=1), COMBO,
    note="首核336、次核432。", images=(17,))
row(14, 36, "2.14 冰针绝望2+核+7", "75.1", ice277, COMBO,
    status="需补条件", note="图18只到末尾耀星，按图为−28.3；再接一发绝望为75.1。",
    variants=(("末尾再接一发D", add(ice277, dict(D=1)), COMBO),), images=(18,))
row(15, 37, "2.15 冰针3+核+0", "−14.9", add(rear3fl, dict(B4=1, U=1)), BASE, images=(19,))
row(16, 38, "2.16 剩余蓝3+核+0", "108.3", add(fire_no_d, rear3fl), COMBO,
    status="需补条件", note="按常规前段6火4＋A＋耀星、省D计算为94.9。108.3需另设“前段D换A”的参照，原图未给完整前段，暂不能确认。",
    variants=(("注释的D换A假设", add(rear3fl, dict(A=1)), add(BASE, dict(D=1))),), images=(20,))
row(17, 39, "2.17 U3d", "−3.8", dict(U=1, F3=1, D=1), {},
    note="按补GCD口径：新增3个GCD，1576−3Q。", images=(21,))
row(18, 40, "2.18 UM", "13.4", add(FIRE, dict(U=1)), FIRE,
    note="共同魔泉火段抵消，多一发U：540−Q。", images=(22,))
row(19, 41, "2.19 AM", "13.4", add(FIRE, dict(A=1)), FIRE,
    note="共同魔泉火段抵消，多一发A：540−Q。", images=(23,))
row(20, 42, "2.20 即刻一档冰火3", "−145", dict(F3UI1=1), dict(F3=1),
    status="需补条件", note="−145是火3替换项。若按图中绝望后直接冰3计算，冰3再亏87，两项合计−232。",
    variants=(("直接AF3冰3＋UI1火3", dict(B3AF3=1, F3UI1=1), dict(B3=1, F3=1)),), images=(24,))
row(21, 43, "2.21 A即刻冰3", "−29", dict(A=1, B3AF1=1), dict(U=1, B3=1),
    note="A与U等威力，差额为261−290。", images=(25,))
row(22, 44, "2.22 剩余蓝A即刻冰3", "−132",
    add({k: v for k, v in BASE.items() if k != "D"}, dict(A=1, B3AF1=1)), add(BASE, dict(U=1, B3=1)),
    status="需补条件", note="按标题接上末尾冰3，得到−132.384615，取整数−132正确；图26只画到即刻。", images=(26,))
row(23, 45, "2.23 B4A核核耀", "−125", dict(B4=1, A=1, Fl1=1, Fl3=1, FS=1), BASE,
    note="−125.076923取整数为−125。", images=(27,))


def aoe_total(n):
    ice = F(300) if n == 2 else F(120 * n)
    return ice + 540 + 768 * (1 + F("0.7") * (n - 1)) + 900 * (1 + F("0.35") * (n - 1))


for no, sec, n, drop, title, original, image_no in [
    (24, 48, 2, False, "3.1.1 双目标B4U核核耀", "0", 28),
    (25, 49, 2, True, "3.1.2 双目标B4核核耀", "132", 29),
    (26, 52, 3, False, "3.2.1 三目标玄冰U核核耀", "0", 30),
    (27, 53, 3, True, "3.2.2 三目标玄冰核核耀", "314.6", 31),
]:
    total = aoe_total(n)
    q = total / 5
    value = q - 540 if drop else F(0)
    note = "两边共同的秽浊及其GCD抵消后，少一发U。" if drop else "基准自身，p＝0。"
    if no == 25:
        note += "Q₂先取672时，差额式得132；132.6是绝对式的结果。"
    if no == 27:
        note += "Q₃先取854.6时，差额式得314.6；314.8是绝对式的结果。"
    rows.append(dict(no=no, section=sec, name=title, original=original, result=fmt(value),
                     status="吻合", note=note,
                     details=[f"S＝{fmt(total)}；Q{n}＝{fmt(q)}", f"p＝Q{n}−540＝{fmt(value)}" if drop else "p＝0"], images=(image_no,)))

q4, q5 = aoe_total(4) / 5, aoe_total(5) / 5
assert (q4, q5) == (F("1049.16"), F("1243.68"))
for no, sec, title, value, note, details, image_no in [
    (28, 55, "3.3.1 四目标以上玄冰群雷核核耀", "T−540",
     "原帖未给固定p。T为本次雷相对不放这发雷真正多出的总伤害；一换一替换U时此式成立。",
     ["完整新雷、跳满且无旧DoT损失时，T＝420n；4目标p＝1140，5目标p＝1560。",
      "若只增加直伤，T＝100n；4目标p＝−140，5目标p＝−40。连续循环不能把每发雷都按跳满计算。"], 32),
    (29, 56, "3.3.2 四目标以上玄冰核核耀", "Qₙ−540",
     "共同秽浊抵消、相对U循环少一发U：4目标509.16，5目标703.68。",
     ["Qₙ＝194.52n＋271.08。此结果是对U循环的差额，不能直接叫作跳过群雷的收益。"], 33),
    (30, 57, "3.3.3 四至五目标玄冰U核核耀", "0；对群雷版为540−T",
     "自身定义为参照时p＝0；和群雷版比较时，要看那发雷的实际增量伤害。",
     ["T＜540时U更高；T＞540时群雷更高。"], 34),
    (31, 58, "3.3.4 单星灵玄冰核核耀", "157.2n−511.2−Qₙ×Δt/g",
     "HF2为UI1下90n威力；首核从336升到432。须扣HF2比普通GCD多占的时间。",
     ["g为相同加速条件下的实际GCD时长，Δt为实际额外耗时。",
      "瞬发覆盖：4目标117.6，5目标274.8。",
      "忽略额外延迟、双方速度相同，长读条3秒对2.5秒，即Δt/g＝0.2：4目标−92.232，5目标26.064。"], 35),
]:
    rows.append(dict(no=no, section=sec, name=title, original="未给固定p", result=value,
                     status="条件公式", note=note, details=details, images=(image_no,)))

assert len(rows) == 31
counts = Counter(r["status"] for r in rows)
assert counts == {"吻合": 20, "末位差异": 2, "需补条件": 5, "条件公式": 4}

# Mana thresholds are minimum MP on entering the relevant fire segment.
mana = [
    ("AM、A即刻冰3", 1600, 1600, "A＝1600"),
    ("冰针3+核+0", 3200, 3 * 800 + 800, "3发火4×800＋核爆前800"),
    ("2+7+核、剩余蓝2+7+核", 4000, 2 * 1600 + 800, "2发火4×1600＋绝望前800"),
    ("冰针绝望2+核+7", 4000, 2 * 800 + 2400, "2发火4×800＋核爆前2400；余800接绝望"),
    ("B4A核核耀", 4000, 1600 + 2400, "A1600＋首核前2400；余800接第二核"),
    ("冰针5+7", 5600, 3 * 800 + 2 * 1600, "3发火4×800＋2发火4×1600"),
    ("剩余蓝3+核+0", 5600, 3 * 1600 + 800, "3发火4×1600＋核爆前800"),
    ("冰针绝望5+7、单星灵冰针绝望5+7", 6400, 3 * 800 + 2 * 1600 + 800, "5发火4耗5600＋绝望前800"),
    ("剩余蓝冰针6+0改", 7200, 3 * 800 + 3 * 1600, "3发火4×800＋3发火4×1600"),
    ("魔泉剩余蓝冰针6+6、剩余蓝冰针6+0", 8000, 3 * 800 + 3 * 1600 + 800, "6发火4耗7200＋绝望前800"),
]
assert all(expected == actual for _, expected, actual, _ in mana)


def image_links(items):
    links = []
    for item in items:
        pattern = f"{item:02d}-*" if isinstance(item, int) else f"{item}-*"
        files = list((ROOT / "images").glob(pattern))
        assert len(files) == 1, pattern
        label = f"图{item}" if isinstance(item, int) else item.replace("extra-", "附件")
        links.append(f'<a href="{quote("images/" + files[0].name)}">{esc(label)}</a>')
    return " · ".join(links)


table = []
for r in rows:
    link = quote(GUIDE) + f'#section-{r["section"]}'
    detail = "".join(f"<p>{esc(d)}</p>" for d in r["details"])
    table.append(f'''<tr class="{r['status']}"><td>{r['no']}</td>
<td><a href="{link}">{esc(r['name'])}</a></td><td>{esc(r['original'])}</td>
<td>{esc(r['result'])}</td><td>{esc(r['status'])}</td>
<td>{esc(r['note'])}<details><summary>计算与配图</summary>{detail}<p>{image_links(r['images'])}</p></details></td></tr>''')

mana_table = "".join(f"<tr><td>{esc(name)}</td><td>{expected}</td><td>{esc(equation)}</td><td>吻合</td></tr>"
                     for name, expected, _, equation in mana)
page = '''<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>31个特化循环 · 数值核查</title><style>
*{box-sizing:border-box}body{margin:0;background:#f5f6f8;color:#202830;font:16px/1.65 system-ui,"Microsoft YaHei",sans-serif}
main{max-width:1440px;margin:auto;padding:36px 28px 60px}h1{font-size:30px;margin:0 0 10px}h2{font-size:22px;margin-top:30px}
a{color:#2456a6;text-underline-offset:3px}.intro{max-width:1050px}.summary{padding:14px 18px;background:white;border-left:4px solid #2456a6}
.scroll{overflow-x:auto;background:white;border:1px solid #dce1e6;border-radius:8px}table{width:100%;border-collapse:collapse;min-width:880px}
th,td{padding:12px 14px;border-bottom:1px solid #e6e9ed;vertical-align:top;text-align:left}th{background:#edf1f6;font-size:14px}
td:nth-child(1){width:45px}td:nth-child(2){min-width:225px}td:nth-child(3),td:nth-child(5){white-space:nowrap}
td:nth-child(4){min-width:130px}.需补条件 td:nth-child(5){color:#9a4c06}.末位差异 td:nth-child(5){color:#725c22}
details{margin-top:8px;font-size:14px}summary{cursor:pointer;color:#2456a6}details p{margin:8px 0}.muted{color:#576674;font-size:14px}
@media(max-width:700px){main{padding:22px 14px}h1{font-size:25px}}@media print{body{background:white}main{padding:0}details{display:block}}
</style><main><h1>31个特化循环 · 数值核查</h1>
<p class="muted">2026-10-21 · 7.2威力口径 · 原图逐项计数，分数运算保留完整精度</p>
<div class="intro"><p class="summary"><strong>20项数值吻合，2项存在末位差异，5项需要补足图示或比较条件；另4项原帖没有固定p，按条件公式核查。</strong></p>
<p>收益按 <strong>p＝（目标总威力−参照总威力）−Q×（目标GCD数−参照GCD数）</strong> 计算。
单体Q＝6846÷13＝526.615384…；双目标Q₂＝672.12，三目标Q₃＝854.64。表内显示最多三位小数，运算过程不提前舍入。</p>
<p>起手与魔泉结构沿用注释版的对应参照：起手14GCD／8100，常规火段9GCD／5310，火段＋基准22GCD／12156。
这些参照自身的S−QG不为0，所以需比较双方差额。雷、异言、秽浊只有在两边次数、有效伤害和占用GCD相同时才抵消。
本表核查静态威力，不含天语、团辅和药；瞬发资源、火苗及蓝量仍须满足。</p>
<p>主要威力和7.2改动核对自<a href="https://na.finalfantasyxiv.com/lodestone/topics/detail/3c4910f373e497acd3428c37f6358e341e4cc06d/">官方7.2补丁说明</a>；
元素倍率、AOE衰减及技能规则对照<a href="https://na.finalfantasyxiv.com/jobguide/blackmage/">官方黑魔职业指南</a>。
使用火4 540、悖论540、绝望630、耀星900、AF1／AF3核爆336／432，均未乘天语。</p></div>
<div class="scroll"><table><thead><tr><th>序</th><th>循环</th><th>原文p</th><th>复算p</th><th>结论</th><th>说明</th></tr></thead><tbody>''' + "\n".join(table) + '''</tbody></table></div>
<h2>注释公式的三处统一建议</h2>
<p>图29与图31的舍入说明应统一使用差额式。先把Q₂取672，少U的差额是672−540＝132；先把Q₃取854.6，差额是854.6−540＝314.6。
注释中的132.6和314.8来自另一种绝对式，不能作为差额式的舍入结果。</p>
<p>图35正文的Δt÷2.5应写为Δt÷g，其中g是与Δt同一加速条件下的实际GCD。原文后面的修正提示已说明这一点，正文也应与之统一。</p>
<h2>进火蓝量</h2><p>文档中的10行门槛全部算术吻合。这是进入对应火段所需的最低MP；冰段能否在相应时间内回到这个数，还取决于醒梦跳点与填充安排。带火3的路线按火苗免耗蓝。</p>
<div class="scroll"><table><thead><tr><th>结构</th><th>最低MP</th><th>算式</th><th>结论</th></tr></thead><tbody>''' + mana_table + '''</tbody></table></div>
<p class="muted">缩写：F4火4，F3火3（默认AF1），B3冰3（默认UI1），B4冰4，A火悖论，U冰悖论，D绝望，Fl1／Fl3为AF1／AF3核爆，FS耀星。
“需补条件”各行的计算与配图可展开查看。复算脚本：<a href="audit-31-rotations.py">audit-31-rotations.py</a>。</p></main></html>'''

output = ROOT / "31个特化循环-数值核查.html"
output.write_text(page, encoding="utf-8")
for r in rows:
    print(f"{r['no']:2} {r['name']}: {r['original']} -> {r['result']} [{r['status']}]")
print("Summary:", dict(counts), "Mana: 10/10")
print("Output:", output)
