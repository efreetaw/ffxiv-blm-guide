# 黑魔研究

这里记录从攻略中进一步提出的问题、计算条件和可以复算的结果。

## 不定 GCD 下的斩杀特化

问题：目标即将死亡或消失，只剩有限的输出时间时，怎样安排技能，使截止前实际命中的总伤害最高？

第一题：[高闪雷在总1—13个GCD下相对Q的盈亏](limited-gcd/high-thunder.md) · [HTML画面](../docs/不定gcd下的斩杀特化/index.html#1-1)

总GCD数包含当前打雷这一格；目标在最后一个完整GCD窗口结束时不可选中。比较这发雷在截止前的期望伤害与基线Q＝6846/13。

计算入口：[high_thunder.py](limited-gcd/high_thunder.py)。在仓库根目录运行：

```sh
python3 research/limited-gcd/high_thunder.py
python3 research/limited-gcd/high_thunder.py --check
```

第一条输出按总GCD数列出的期望收益表，第二条核对表格与跳伤枚举结果。使用Python标准库。

第二题：[基准循环只打完1—13个GCD时，ΔP是多少？](limited-gcd/standard-cycle-cutoff.md) · [HTML画面](../docs/不定gcd下的斩杀特化/index.html#2-1)

第三题：[核心1—13G的斩杀特化怎么选？](limited-gcd/execute-rotations.md) · [HTML画面](../docs/不定gcd下的斩杀特化/index.html#3-1)

参考表：[单体特化循环：ΔGCD、ΔP与前置需求](limited-gcd/specialized-cycles.md)
