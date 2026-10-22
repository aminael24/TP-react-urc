
BEGIN;
CREATE TABLE users (
                       user_id SERIAL PRIMARY KEY,
                       username VARCHAR(50) UNIQUE NOT NULL,
                       password VARCHAR(100) NOT NULL,
                       email VARCHAR(255) UNIQUE NOT NULL,
                       created_on TIMESTAMP NOT NULL DEFAULT NOW(),
                       last_login TIMESTAMP,
                       external_id VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE rooms (
                       room_id SERIAL PRIMARY KEY,
                       name VARCHAR(50) UNIQUE NOT NULL,
                       created_on TIMESTAMP NOT NULL DEFAULT NOW(),
                       created_by INTEGER NOT NULL
                           REFERENCES users(user_id),
                       is_private BOOLEAN NOT NULL DEFAULT FALSE
);


CREATE TABLE room_members (
                              room_id INTEGER NOT NULL
                                  REFERENCES rooms(room_id) ON DELETE CASCADE,
                              user_id INTEGER NOT NULL
                                  REFERENCES users(user_id) ON DELETE CASCADE,
                              joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
                              PRIMARY KEY (room_id, user_id)
);


CREATE INDEX idx_room_members_user
    ON room_members(user_id);

INSERT INTO users (
    username, password, email, external_id
)
VALUES (
           'test',
           'gcrjEewWyAuYskG3dd6gFTqsC6/SKRsbTZ+g1XHDO10=',
           'test@univ-brest.fr',
           'ac7a25a9-bcc5-4fba-8a3d-d42acda26949'
       );


INSERT INTO rooms (name, created_by, is_private)
SELECT salon.name, u.user_id, FALSE
FROM users u
         CROSS JOIN (
    VALUES ('General'), ('News'), ('Random')
) AS salon(name)
WHERE u.username = 'test';

COMMIT;
