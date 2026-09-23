#!/usr/bin/env python3
"""Строка подключения к базе из секрета SUPABASE_DB_URL (переменная DB) → нормальный вид для psql.

Прощает типичные ошибки вставки: пробелы, переводы строк и кавычки вокруг, «psql » в начале,
квадратные скобки вокруг пароля ([YOUR-PASSWORD]), спецсимволы в пароле без кодирования,
имя пользователя «postgres» вместо «postgres.<проект>» для Session pooler.
Пароль в вывод не попадает: в stdout — только готовая строка (workflow сразу маскирует её),
в stderr — описание того, что исправлено.
"""
import os
import sys
import urllib.parse as up


def fail(msg):
    print(f'::error::SUPABASE_DB_URL: {msg}', file=sys.stderr)
    sys.exit(1)


def main():
    s = os.environ.get('DB', '').strip()
    notes = []
    if s.lower().startswith('psql '):
        s, _ = s[5:].strip(), notes.append('убрано «psql» в начале')
    if len(s) > 1 and s[0] == s[-1] and s[0] in '"\'':
        s, _ = s[1:-1].strip(), notes.append('убраны кавычки')
    if not s:
        fail('секрет пустой')
    if '://' not in s:
        fail(f'нет адреса вида postgresql://… (длина значения {len(s)}). Скопируйте строку из Supabase → Connect → Session pooler')
    scheme, rest = s.split('://', 1)
    if scheme not in ('postgresql', 'postgres'):
        fail(f'строка должна начинаться с postgresql://, а начинается с «{scheme[:12]}://»')
    at = rest.rfind('@')  # в пароле может быть «@», адрес сервера — после последнего
    if at < 0:
        fail('нет «пользователь:пароль@» перед адресом сервера')
    cred, host = rest[:at], rest[at + 1:]
    if ':' not in cred:
        fail('нет пароля: после имени пользователя должно идти «:пароль»')
    user, pwd = cred.split(':', 1)
    if pwd.startswith('[') and pwd.endswith(']'):
        pwd = pwd[1:-1]
        notes.append('убраны квадратные скобки вокруг пароля')
    if pwd.upper() in ('YOUR-PASSWORD', 'YOUR_PASSWORD', 'PASSWORD', ''):
        fail('вместо пароля остался шаблон [YOUR-PASSWORD] — подставьте пароль базы данных')
    raw = up.unquote(pwd)
    enc = up.quote(raw, safe='')
    if enc != pwd:
        notes.append('спецсимволы в пароле закодированы')
    hostname = host.split('/')[0].split(':')[0]
    ref = os.environ.get('PROJECT_REF', '')
    if 'pooler.supabase.com' in hostname and user == 'postgres' and ref:
        user = f'postgres.{ref}'
        notes.append('имя пользователя для pooler: postgres.<проект>')
    if 'pooler.supabase.com' not in hostname:
        notes.append(f'сервер {hostname} — не Session pooler (с GitHub нужен pooler: у прямого адреса только IPv6)')
    print(f'Сервер: {hostname}, пользователь: {user}, длина пароля: {len(raw)}' + (f'; исправлено: {", ".join(notes)}' if notes else ''), file=sys.stderr)
    print(f'postgresql://{user}:{enc}@{host}')


if __name__ == '__main__':
    main()
