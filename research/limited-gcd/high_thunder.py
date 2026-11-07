#!/usr/bin/env python3
"""Compare High Thunder against Q over 1-13 total GCDs, including its cast.

Run with no arguments to print the reference table; --check verifies the
table against enumerated server-tick phases.
"""

import argparse
from fractions import Fraction
from pathlib import Path


Q = Fraction(6846, 13)
# Level 100, 2.45 GCD set: XIVMath.preTaxGcd and overtimePotency.
SPELL_SPEED = 787
SPEED_TIER = (SPELL_SPEED - 420) * 130 // 2780
GCD = Fraction(2500 * (1000 - SPEED_TIER) // 10_000, 100)
APPLICATION_DELAY = Fraction(757, 1000)
PERIOD = 3
DURATION = 30
DIRECT = 150
TICK = 60 * Fraction(1000 + SPEED_TIER, 1000)
MAX_TICKS = 10


def expected_thunder(deadline):
    """Expected ticks and potency with a uniformly distributed tick phase."""
    available = Fraction(deadline) - APPLICATION_DELAY
    if available <= 0:
        return Fraction(0), Fraction(0)
    ticks = min(available, Fraction(DURATION)) / PERIOD
    return ticks, DIRECT + TICK * ticks


def render_table():
    lines = [
        "| 总 GCD 数 N（含打雷） | 距目标死亡（秒） | 期望跳数 | 雷期望威力 | 相对 Q 的期望盈亏 ΔP雷 |",
        "| ---: | ---: | ---: | ---: | ---: |",
    ]
    for total_gcds in range(1, 14):
        deadline = total_gcds * GCD
        ticks, mean = expected_thunder(deadline)
        lines.append(
            f"| {total_gcds} | {float(deadline):.2f} | {float(ticks):.3f} | {float(mean):.2f} "
            f"| {float(mean - Q):+.2f} |"
        )
    return "\n".join(lines)


def count_ticks_ms(deadline_ms, phase_half_ms):
    """Independent event enumeration, using integer half-milliseconds.

    Odd phases keep application, death and expiry events distinct.
    """
    application = 2 * 757
    end = min(2 * deadline_ms, application + 60_000)
    first = phase_half_ms
    while first <= application:
        first += 6_000
    return sum(first + 6_000 * tick < end for tick in range(MAX_TICKS))


def check():
    assert GCD == Fraction(245, 100)
    assert TICK == Fraction(3051, 50)
    q_tie = APPLICATION_DELAY + PERIOD * (Q - DIRECT) / TICK
    assert expected_thunder(q_tie)[1] == Q
    assert expected_thunder(q_tie - Fraction(1, 1000))[1] < Q
    assert expected_thunder(q_tie + Fraction(1, 1000))[1] > Q
    assert expected_thunder(7 * GCD)[1] < Q < expected_thunder(8 * GCD)[1]
    assert expected_thunder(13 * GCD)[1] == Fraction(3801, 5)
    assert expected_thunder(APPLICATION_DELAY) == (0, 0)
    assert expected_thunder(APPLICATION_DELAY - Fraction(1, 1000)) == (0, 0)

    cases = 0
    gcd_ms = int(GCD * 1000)
    for total_gcds in range(1, 14):
        ticks = [
            count_ticks_ms(total_gcds * gcd_ms, phase)
            for phase in range(1, 6000, 2)
        ]
        expected_ticks, mean = expected_thunder(total_gcds * GCD)
        assert Fraction(sum(ticks), len(ticks)) == expected_ticks, total_gcds
        assert DIRECT + TICK * expected_ticks == mean
        cases += len(ticks)

    # Eight total GCDs: the first positive result relative to Q.
    assert expected_thunder(8 * GCD)[1] == Fraction(26663331, 50000)

    note = Path(__file__).with_name("high-thunder.md").read_text()
    table = note.split("<!-- table:start -->\n", 1)[1].split("\n<!-- table:end -->", 1)[0]
    assert table == render_table(), "Research note table differs from calculation"
    print(f"PASS: {cases:,} tick-phase/deadline cases; thresholds; note table.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify the documented calculation")
    args = parser.parse_args()
    check() if args.check else print(render_table())
