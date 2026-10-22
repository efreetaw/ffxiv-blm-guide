# 黑魔研究

这里记录从攻略中进一步提出的问题、计算条件和可以复算的结果。

## 限定 GCD 下的选择优化

问题：目标即将死亡或消失，只剩有限的输出时间时，怎样安排技能，使截止前实际命中的总伤害最高？

第一题：[只剩 1—13 个 GCD，高闪雷什么时候值得打？](limited-gcd/high-thunder.md)

本题已经明确：**目标死亡或消失时，直伤和 DoT 都停止计入；不能把结束后的雷伤算进收益。**

目前完成的是高闪雷的跳数与替换收益计算。它给出不同机会成本下的门槛；完整冰火序列的最优解还需要指定初始资源与技能可用情况。

计算入口：[high_thunder.py](limited-gcd/high_thunder.py)。在仓库根目录运行：

```sh
python3 research/limited-gcd/high_thunder.py
python3 research/limited-gcd/high_thunder.py --check
```

第一条输出 1—13 GCD 表，第二条核对表格与离散跳伤计算。均不写入文件，不需要安装第三方依赖。
