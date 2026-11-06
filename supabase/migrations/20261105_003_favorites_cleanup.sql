-- Remove four empty placeholder lists (user_id 1-4 matched no User row), then enforce the link so
-- orphaned lists cannot return. Deleting a user removes their lists; deleting a list removes its spots.
delete from public."FavoritesList" l
where l."list_ID" in (1,2,3,4)
  and not exists (select 1 from public."User" u where u.user_id = l.user_id)
  and not exists (select 1 from public."Favorites" f where f."list_ID" = l."list_ID");

alter table public."FavoritesList"
  add constraint favorites_list_user_fk foreign key (user_id) references public."User"(user_id) on delete cascade;
alter table public."FavoritesList" alter column user_id set not null;

alter table public."Favorites" drop constraint "Favorites_list_ID_fkey";
alter table public."Favorites" add constraint "Favorites_list_ID_fkey" foreign key ("list_ID") references public."FavoritesList"("list_ID") on delete cascade;
