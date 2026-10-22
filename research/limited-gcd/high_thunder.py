#!/usr/bin/env python3
"""High Thunder terminal-window arithmetic, not a full rotation simulator.

Run with no arguments to print the reference table; --check verifies the
table against enumerated server-tick phases.
"""

import argparse
from fractions import Fraction
from pathlib import Path


Q = Fraction(6846, 13)
GCD = Fraction(5, 2)
APPLICATION_DELAY = Fraction(757, 1000)
PERIOD = 3
DURATION = 30
DIRECT = 150
TICK = 60
MAX_TICKS = 10


def ceil_fraction(value):
    return -(-value.numerator // value.denominator)


def required_ticks(cost):
    """Strictly positive gain; None means even a full DoT cannot win."""
    count = max(0, (Fraction(cost) - DIRECT) // TICK + 1)
    return count if count <= MAX_TICKS else None


def phase_summary(deadline, press=Fraction(0)):
    """Range and uniform-phase expectation, excluding simultaneous events.

    Times are seconds relative to now. Damage at the death timestamp is
    excluded. A full 30-second, non-coincident DoT has ten ticks.
    """
    available = Fraction(deadline) - Fraction(press) - APPLICATION_DELAY
    if available <= 0:
        return 0, 0, Fraction(0)
    active = min(available, Fraction(DURATION))
    low = active // PERIOD
    high = ceil_fraction(active / PERIOD)
    mean = DIRECT + TICK * active / PERIOD
    return low, high, mean


def render_table():
    lines = [
        "| 剩余 GCD | 截止时间（秒） | 雷跳数 | 雷总威力 | 对比火4的收益范围 | 平均收益：对比火4 | 平均收益：对比 Q |",
        "| ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for count in range(1, 14):
        low, high, mean = phase_summary(count * GCD)
        potency_low, potency_high = DIRECT + TICK * low, DIRECT + TICK * high
        ticks = str(low) if low == high else f"{low}—{high}"
        potency = str(potency_low) if low == high else f"{potency_low}—{potency_high}"
        delta_low, delta_high = potency_low - 540, potency_high - 540
        delta = f"{delta_low:+d}" if low == high else f"{delta_low:+d} 至 {delta_high:+d}"
        lines.append(
            f"| {count} | {float(count * GCD):.1f} | {ticks} | {potency} | {delta} "
            f"| {float(mean - 540):+.2f} | {float(mean - Q):+.2f} |"
        )
    return "\n".join(lines)


def count_ticks_ms(press_ms, deadline_ms, phase_half_ms):
    """Independent event enumeration, using integer half-milliseconds.

    Odd phases avoid application/death/expiry coincidences in the reference
    grid, so this does not claim to verify the simulator's tie ordering.
    """
    application = 2 * (press_ms + 757)
    end = min(2 * deadline_ms, application + 60_000)
    first = phase_half_ms
    while first <= application:
        first += 6_000
    return sum(first + 6_000 * tick < end for tick in range(MAX_TICKS))


def check():
    assert required_ticks(Q) == 7
    assert required_ticks(540) == 7
    assert required_ticks(630) == 9  # Eight ticks tie Despair, not a gain.
    assert required_ticks(300) == 3
    assert required_ticks(406) == 5
    assert required_ticks(890) is None
    assert required_ticks(900) is None
    assert required_ticks(150) == 1  # Direct damage alone only ties.
    assert required_ticks(0) == 0
    assert phase_summary(APPLICATION_DELAY) == (0, 0, 0)
    assert phase_summary(APPLICATION_DELAY - Fraction(1, 1000)) == (0, 0, 0)

    cases = 0
    for count in range(1, 14):
        for slot in range(1, count + 1):
            ticks = [
                count_ticks_ms((slot - 1) * 2500, count * 2500, phase)
                for phase in range(1, 6000, 2)
            ]
            low, high, mean = phase_summary(count * GCD, (slot - 1) * GCD)
            assert (min(ticks), max(ticks)) == (low, high), (count, slot)
            assert DIRECT + TICK * Fraction(sum(ticks), len(ticks)) == mean
            cases += len(ticks)

    # Eight-GCD boundary: positive relative to Q on average, negative vs F4.
    assert phase_summary(8 * GCD)[2] == Fraction(26743, 50)
    assert Q < phase_summary(8 * GCD)[2] < 540
    wins = sum(count_ticks_ms(0, 20_000, phase) >= 7 for phase in range(1, 6000, 2))
    assert Fraction(wins, 3000) == Fraction(1243, 3000)

    note = Path(__file__).with_name("high-thunder.md").read_text()
    table = note.split("<!-- table:start -->\n", 1)[1].split("\n<!-- table:end -->", 1)[0]
    assert table == render_table(), "Research note table differs from calculation"
    print(f"PASS: {cases:,} tick-phase/slot cases; thresholds; note table.")
    print("Scope: independent arithmetic; no full simulator replay or rotation search.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify the documented calculation")
    args = parser.parse_args()
    check() if args.check else print(render_table())
