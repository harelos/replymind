# Synthetic verification

Dataset: 100 visits, 90 advertorial views, 45 sales views, 18 checkout starts, 9 purchases, 1 refund, 27,000 gross revenue minor-units, and 9,000 advertising-cost minor-units.

Expected deterministic results: advertorial → sales 50%; sales → checkout 40%; checkout → purchase 50%; overall conversion 9%; CAC 1,000 minor-units. The automated test reproduces these values and checks that division by zero returns `null`, not an invented number.

This report does not claim production verification. No production events or provider credentials were available or used.
