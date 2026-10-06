"""Tests for the skincare diagnosis: its topics, in order, skipping what is known (spec 002)."""

import pytest

from app.agents.diagnosis import Diagnosis, Topic, implied_texture, known, mentioned
from app.catalogue.models import Concern, SkinType, TexturePreference
from app.profile.models import AgeRange, BeautyProfile, ProductFeedback

EMPTY = BeautyProfile()


@pytest.mark.parametrize(
    "said, topics",
    [
        ("My skin has been feeling really tight lately.", {Topic.SKIN_TYPE}),
        (
            "It's dry, mostly on my cheeks, and it gets red quite easily.",
            {Topic.SKIN_TYPE, Topic.REDNESS},
        ),
        ("I love rich creams, around twenty five euros.", {Topic.TEXTURE, Topic.PRODUCT}),
        ("Normal to dry, and not sensitive at all.", {Topic.SKIN_TYPE, Topic.REDNESS}),
        ("Something lightweight please.", {Topic.TEXTURE}),
        ("It stings a bit when I put cream on.", {Topic.REDNESS, Topic.PRODUCT}),
        ("J'ai la peau sèche et elle tiraille.", {Topic.SKIN_TYPE}),
        ("Elle est réactive, avec des rougeurs.", {Topic.REDNESS}),
        ("Je préfère les textures légères.", {Topic.TEXTURE}),
        ("Peau mixte, un peu brillante.", {Topic.SKIN_TYPE}),
        ("I'm looking for a new skincare routine, especially a new moisturizer.", {Topic.PRODUCT}),
        ("I'd like some help with my skincare routine.", set()),
        ("J'aimerais un peu d'aide pour ma routine de soin.", set()),
        ("I need a sunscreen for the summer.", {Topic.PRODUCT}),
        ("Je cherche un sérum.", {Topic.PRODUCT}),
        ("I'm on a tight budget.", set()),
        ("Brilliant, give me a sec.", set()),
        ("I'd like to reduce the first lines.", {Topic.CONCERN}),
        ("Mostly hydration, I'd say.", {Topic.CONCERN}),
        ("Maybe more radiance.", {Topic.CONCERN}),
        ("Plus d'éclat, et moins de rides.", {Topic.CONCERN}),
        ("Je cherche une crème hydratante.", {Topic.PRODUCT}),
        ("I'd like a moisturiser for the first signs of ageing.", {Topic.PRODUCT, Topic.CONCERN}),
        ("The texture is nice.", set()),
        (
            "I use a L'Oréal cream, but it's too heavy.",
            {Topic.CURRENT_PRODUCT, Topic.TEXTURE, Topic.PRODUCT},
        ),
        ("I've been using Nivea for years.", {Topic.CURRENT_PRODUCT}),
        ("J'utilise une crème CeraVe.", {Topic.CURRENT_PRODUCT, Topic.PRODUCT}),
        ("How do I use it?", set()),
        ("I'm 38.", {Topic.AGE}),
        ("I'm in my forties.", {Topic.AGE}),
        ("J'ai quarante-deux ans.", {Topic.AGE}),
        ("I'm 25 euros short.", set()),
    ],
)
def test_words_that_answer_a_topic(said: str, topics: set[Topic]) -> None:
    assert mentioned(said) == topics


def test_the_profile_answers_what_it_holds() -> None:
    profile = BeautyProfile(skin_type=SkinType.DRY, sensitive=False)
    feedback = BeautyProfile(product_feedback=[ProductFeedback(brand="CeraVe")])

    assert known(profile) == {Topic.SKIN_TYPE, Topic.REDNESS}
    assert known(BeautyProfile(texture_preference=TexturePreference.RICH)) == {Topic.TEXTURE}
    assert known(feedback) == {Topic.CURRENT_PRODUCT}
    assert known(BeautyProfile(age_range=AgeRange.FORTIES)) == {Topic.AGE}
    # The extractor reads concerns into "quite dry": only words or the question answer the topic.
    assert known(BeautyProfile(concerns=[Concern.HYDRATION])) == set()
    assert known(EMPTY) == set()


def run(*lines: str, profile: BeautyProfile = EMPTY) -> list[Topic | None]:
    """The topic asked at each turn, one visitor line per turn."""
    diagnosis = Diagnosis()
    asked = []
    for turn in range(len(lines)):
        diagnosis.advance(turn, list(lines[: turn + 1]), profile)
        asked.append(diagnosis.asking)
    return asked


def test_six_questions_in_order_when_the_visitor_volunteers_nothing() -> None:
    asked = run(
        "A new moisturiser.",
        "Quite oily.",
        "No, never.",
        "Nothing in particular.",
        "Nothing special.",
        "Light.",
        "I'm 34.",
    )

    assert asked == [
        Topic.SKIN_TYPE,
        Topic.REDNESS,
        Topic.CONCERN,
        Topic.CURRENT_PRODUCT,
        Topic.TEXTURE,
        Topic.AGE,
        None,
    ]


def test_a_vague_opening_asks_which_product_first() -> None:
    asked = run("I'd like some help with my skincare routine.", "A moisturiser, please.")

    assert asked == [Topic.PRODUCT, Topic.SKIN_TYPE]


def test_the_concierge_summary_names_the_product_and_nothing_else() -> None:
    diagnosis = Diagnosis()
    summary = "Looking for a moisturiser; skin has felt tight lately."
    diagnosis.advance(0, ["Something for my skin, please."], EMPTY, summary)

    assert diagnosis.asking == Topic.SKIN_TYPE


def test_a_topic_the_visitor_already_mentioned_is_skipped() -> None:
    asked = run(
        "Hi! I'm looking for a moisturiser, my skin has been feeling really tight lately.",
        "It's dry, mostly on my cheeks, and it gets red quite easily.",
        "Mostly hydration.",
        "I use a L'Oréal Paris day cream, but it feels too light.",
        "I'm thirty-eight.",
    )

    assert asked == [Topic.REDNESS, Topic.CONCERN, Topic.CURRENT_PRODUCT, Topic.AGE, None]


def test_a_first_sentence_that_covers_everything_needs_no_question() -> None:
    said = "I'm 42 and I use a rich cream for my dry skin, which reddens easily and lacks moisture."

    assert run(said) == [None]


def test_a_topic_the_profile_holds_is_skipped() -> None:
    profile = BeautyProfile(skin_type=SkinType.NORMAL)

    assert run("A moisturiser, please.", profile=profile) == [Topic.REDNESS]


def test_an_answer_without_keywords_still_answers_the_question_asked() -> None:
    assert run("A moisturiser.", "Hmm, I'm not sure.") == [Topic.SKIN_TYPE, Topic.REDNESS]


def test_a_question_instead_of_an_answer_gets_the_topic_asked_again_once() -> None:
    diagnosis = Diagnosis()
    lines = ["A moisturiser.", "What would you recommend?", "Can you just pick one?"]
    asked, again = [], []
    for turn in range(len(lines)):
        diagnosis.advance(turn, lines[: turn + 1], EMPTY)
        asked.append(diagnosis.asking)
        again.append(diagnosis.asked_again)

    assert asked == [Topic.SKIN_TYPE, Topic.SKIN_TYPE, Topic.REDNESS]
    assert again == [False, True, False]


def test_advance_reads_each_turn_once() -> None:
    diagnosis = Diagnosis()
    diagnosis.advance(0, ["A moisturiser."], EMPTY)
    diagnosis.advance(0, ["A moisturiser."], EMPTY)

    assert diagnosis.asking == Topic.SKIN_TYPE
    assert diagnosis.asks == {Topic.SKIN_TYPE: 1}
    assert not diagnosis.complete


@pytest.mark.parametrize(
    "said, texture",
    [
        # Thomas's two runs of 2026-10-06
        ("So now I have La Roche-Posay cream and I feel that it's maybe too thick.", "light"),
        ("I use La Roche-Posay one and I feel that the texture is too rich.", "light"),
        ("I find it a bit too light, I love rich creams.", "rich"),
        ("It's not nourishing enough in winter.", "rich"),
        ("Elle est trop riche pour moi.", "light"),
        ("It's fine, I like it.", None),
    ],
)
def test_a_complaint_about_the_current_cream_implies_a_texture(said: str, texture: str | None):
    assert implied_texture(said) == texture
