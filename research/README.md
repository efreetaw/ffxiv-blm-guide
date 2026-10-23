# 黑魔研究

这里记录从攻略中进一步提出的问题、计算条件和可以复算的结果。

## 限定 GCD 下的选择优化

问题：目标即将死亡或消失，只剩有限的输出时间时，怎样安排技能，使截止前实际命中的总伤害最高？

第一题：[当前打高闪雷，后续还有1—13个GCD，收益如何？](limited-gcd/high-thunder.md)

当前GCD立即打高闪雷，后续1—13个完整GCD窗口结束时目标死亡。比较这发雷在截止前的期望伤害，与当前改打其他技能的收益。

计算入口：[high_thunder.py](limited-gcd/high_thunder.py)。在仓库根目录运行：

```sh
python3 research/limited-gcd/high_thunder.py
python3 research/limited-gcd/high_thunder.py --check
```

第一条输出按后续GCD数量列出的期望收益表，第二条核对表格与跳伤枚举结果。使用Python标准库。

第二题：[基准循环只打完1—13个GCD时，ΔP是多少？](limited-gcd/standard-cycle-cutoff.md)

参考表：[单体特化循环：ΔGCD、ΔP与前置需求](limited-gcd/specialized-cycles.md)
