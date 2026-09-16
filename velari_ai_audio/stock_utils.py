#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Velari Unified Stock Calculation (Python port of src/lib/stock.ts)
==================================================================
Qoidalar:
1. Agar stock_details mavjud va bo'sh bo'lmasa (omborlar xaritasi),
   haqiqiy qoldiq barcha omborlardagi musbat sonlar yig'indisi bo'ladi.
2. Agar stock_details bo'lmasa yoki bo'sh bo'lsa, product.stock olinadi.
3. Haqiqiy qoldiq <= 0 bo'lsa, mahsulot sotuvda yo'q deb hisoblanadi.
"""

import json


def get_product_real_stock(product: dict) -> int:
    """Haqiqiy ombor qoldig'ini hisoblaydi (Unified Stock Logic)."""
    if not product:
        return 0

    details = product.get("stock_details") or product.get("stockDetails")
    if details:
        if isinstance(details, str):
            try:
                details = json.loads(details)
            except Exception:
                details = None

        if isinstance(details, dict) and len(details) > 0:
            total = 0
            for val in details.values():
                try:
                    num = int(val)
                    if num > 0:
                        total += num
                except (ValueError, TypeError):
                    continue
            return total

    fallback = product.get("stock")
    try:
        num = int(fallback)
        return max(0, num)
    except (ValueError, TypeError):
        return 0


def is_product_in_stock(product: dict) -> bool:
    """Mahsulot sotuvda bor-yo'qligini tekshiradi."""
    return get_product_real_stock(product) > 0
