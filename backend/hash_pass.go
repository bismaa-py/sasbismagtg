package main

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	hash, err := bcrypt.GenerateFromPassword([]byte("12345"), bcrypt.DefaultCost)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println(string(hash))
}
