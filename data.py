import random
from pymongo import MongoClient
from faker import Faker

# Create a Faker instance
fake = Faker()

# Number of users, managers, and books to generate
num_users = 10
num_managers = 2
num_books = 30

def generate_data():
    users = []
    for i in range(num_users):
        users.append({
            "_id": i,
            "username": fake.user_name(),
            "password": fake.password(),
            "full_name": fake.name(),
            "address": fake.address().replace('\n', ', '),
            "phone_number": fake.phone_number(),
            "email": fake.email(),
            "role": "user",
        })

    # Add two library managers
    for i in range(num_users, num_users + num_managers):
        users.append({
            "_id": i,
            "username": fake.user_name(),
            "password": fake.password(),
            "full_name": fake.name(),
            "address": fake.address().replace('\n', ', '),
            "phone_number": fake.phone_number(),
            "email": fake.email(),
            "role": "library_manager",
        })

    books = []
    for i in range(num_books):
        copies = [f"{i}_{j}" for j in range(random.randint(2, 5))]
        books.append({
            "_id": i,
            "title": fake.catch_phrase(),
            "description": fake.text(),
            "price": random.randint(10, 100),
            "author": fake.name(),
            "publisher": fake.company(),
            "copies": copies,
        })

    return users, books

def main():
    client = MongoClient('mongodb+srv://divyapusuluru:Divya2000@cluster0.zdhbusz.mongodb.net/')
    db = client['dbms']
    users, books = generate_data()
    db.users.insert_many(users)
    db.books.insert_many(books)

if __name__ == "__main__":
    main()
