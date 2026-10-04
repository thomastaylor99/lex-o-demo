"""Tests for the tool-call accumulator (spec 001)."""

import re

from app.conversation.accumulate import ToolCallAccumulator
from app.conversation.stream import ToolCallFragment


def test_arguments_split_over_three_fragments_join():
    acc = ToolCallAccumulator()
    acc.add(ToolCallFragment(index=0, id="abc123xyz", name="search_products", arguments='{"ca'))
    acc.add(ToolCallFragment(index=0, arguments='tegory": '))
    acc.add(ToolCallFragment(index=0, arguments='"moisturiser"}'))

    calls = acc.complete()

    assert len(calls) == 1
    assert calls[0].arguments == '{"category": "moisturiser"}'


def test_two_calls_with_indexes_one_and_zero_come_back_in_index_order():
    acc = ToolCallAccumulator()
    acc.add(ToolCallFragment(index=1, id="second111", name="get_routine", arguments="{}"))
    acc.add(ToolCallFragment(index=0, id="first1111", name="search_products", arguments="{}"))

    calls = acc.complete()

    assert [call.name for call in calls] == ["search_products", "get_routine"]


def test_call_arriving_whole_in_one_fragment_works():
    acc = ToolCallAccumulator()
    acc.add(
        ToolCallFragment(
            index=0, id="wholecall1", name="add_to_basket", arguments='{"product_ids": []}'
        )
    )

    calls = acc.complete()

    assert len(calls) == 1
    assert calls[0].id == "wholecall1"
    assert calls[0].name == "add_to_basket"
    assert calls[0].arguments == '{"product_ids": []}'


def test_fragment_without_a_name_is_dropped():
    acc = ToolCallAccumulator()
    acc.add(ToolCallFragment(index=0, id="noname123", arguments="{}"))

    assert acc.complete() == []


def test_missing_id_gets_a_nine_character_alphanumeric_fallback():
    acc = ToolCallAccumulator()
    acc.add(ToolCallFragment(index=0, name="search_products", arguments="{}"))

    calls = acc.complete()

    assert len(calls) == 1
    assert re.fullmatch(r"[0-9a-f]{9}", calls[0].id)
