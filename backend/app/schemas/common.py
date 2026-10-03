from decimal import Decimal
from typing import Annotated

from pydantic import PlainSerializer

# Serialize monetary Decimals as JSON numbers instead of strings.
Money = Annotated[Decimal, PlainSerializer(float, return_type=float, when_used="json")]
