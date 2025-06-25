#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
grnti_excel_to_sql.py — Excel (2 колонки) &rarr; INSERT-ы PostgreSQL для кодов ГРНТИ
Использование:
    python grnti_excel_to_sql.py grnti.xlsx grnti_inserts.sql
Требуется:  pip install pandas openpyxl
"""

import sys
import re
import pandas as pd
from typing import Iterable, Tuple

COL_CODE, COL_DESC = "grnti_code", "description"
space_re = re.compile(r"\s+")


def pg_escape(text: str) -> str:
    """Экранирование одиночных кавычек для PostgreSQL."""
    return text.replace("'", "''")


def normalize(text: str) -> str:
    """Удаление дубликатов пробелов и обрезка по краям."""
    return space_re.sub(" ", text).strip()


def rows_to_records(df: pd.DataFrame) -> Iterable[Tuple[str, str]]:
    """
    Преобразует &laquo;рваные&raquo; строки Excel в пару (код, описание).

    Логика та же, что и в udc_excel_to_sql.py:
    • новая непустая ячейка кода &rarr; начало новой записи;
    • последующие строки без кода, но с описанием &rarr; &laquo;продолжение&raquo; описания.
    """
    code, parts = None, []
    for raw_code, raw_desc in df.itertuples(index=False, name=None):
        c = normalize(str(raw_code))
        d = normalize(str(raw_desc))
        if c:  # встретился новый код
            if code and parts:
                yield code, " ".join(parts)
            code, parts = c, [d] if d else []
        elif d and code:  # строка-&laquo;хвост&raquo; для предыдущего кода
            parts.append(d)
    if code and parts:
        yield code, " ".join(parts)


def main(src_xlsx: str, dst_sql: str) -> None:
    df = pd.read_excel(src_xlsx, header=None, dtype=str).fillna("")
    with open(dst_sql, "w", encoding="utf-8") as f:
        f.write(f"-- INSERT-ы ГРНТИ, сгенерировано из {src_xlsx}\n")
        for code, desc in rows_to_records(df):
            f.write(
                "INSERT INTO public.grnti (grnti_code, description) "
                f"VALUES ('{pg_escape(code)}', '{pg_escape(desc)}') "
                "ON CONFLICT (grnti_code) DO NOTHING;\n"
            )


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Использование: python grnti_excel_to_sql.py <вход.xlsx> <выход.sql>")
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])